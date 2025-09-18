#!/usr/bin/env node

// WMACS Conversation Monitor - Automatic Integration for User Suggestions
// This can be called automatically or manually to analyze user input

const WMACSAutoAdvisor = require('./wmacs-auto-advisor.js');

/**
 * Simple function to analyze user input and provide automatic pushback
 * Can be integrated into any conversation system
 */
async function analyzeUserSuggestion(userInput, context = {}) {
  console.log('🔍 WMACS: Analyzing your suggestion for potential issues...\n');
  
  const result = await WMACSAutoAdvisor.analyzeUserInput(userInput, context);
  
  if (result.analyzed && result.highPriorityCount > 0) {
    console.log('\n⚠️  WMACS ADVISORY: I detected some suggestions that need research-backed analysis.');
    console.log('Based on industry best practices and our previous mistakes, here\'s my assessment:\n');
    
    for (const analysis of result.analyses) {
      if (analysis.analysis.decision === 'PUSHBACK_WITH_ALTERNATIVES') {
        console.log(`🛑 PUSHBACK on: "${analysis.suggestion}"`);
        console.log(`\nWhy I'm pushing back:`);
        analysis.analysis.reasoning.slice(0, 3).forEach(reason => {
          console.log(`  • ${reason}`);
        });
        
        if (analysis.analysis.alternatives.length > 0) {
          console.log(`\n💡 Better alternative:`);
          const alt = analysis.analysis.alternatives[0];
          console.log(`  ${alt.alternative}: ${alt.description}`);
          console.log(`  Benefits: ${alt.benefits ? alt.benefits.join(', ') : 'See detailed analysis'}`);
        }
        
        console.log('\n📋 Recommendation: Let\'s research this more thoroughly before proceeding.\n');
      }
    }
    
    return {
      shouldProceed: false,
      hasAlternatives: result.analyses.some(a => a.analysis.alternatives.length > 0),
      analyses: result.analyses
    };
  } else {
    console.log('✅ No high-risk suggestions detected. Proceeding as normal.\n');
    return {
      shouldProceed: true,
      hasAlternatives: false,
      analyses: []
    };
  }
}

// Export for integration
module.exports = { analyzeUserSuggestion };

// CLI usage for manual testing
if (require.main === module) {
  const userInput = process.argv.slice(2).join(' ');
  
  if (!userInput) {
    console.log('Usage: node wmacs-conversation-monitor.js "your suggestion here"');
    console.log('\nExample suggestions to test:');
    console.log('  "Let\'s remove the database indexes to speed things up"');
    console.log('  "We should delete all the old migration files"');
    console.log('  "Can you switch us from PostgreSQL to MongoDB?"');
    process.exit(1);
  }
  
  analyzeUserSuggestion(userInput)
    .then(result => {
      if (!result.shouldProceed) {
        console.log('🚨 WMACS recommends pausing to research alternatives before implementing this suggestion.');
      } else {
        console.log('🟢 WMACS analysis complete - suggestion appears safe to proceed.');
      }
    })
    .catch(error => {
      console.error('❌ Analysis failed:', error.message);
    });
}
