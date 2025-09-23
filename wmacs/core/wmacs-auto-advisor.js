#!/usr/bin/env node

// WMACS Auto-Advisor - Automatic Research Integration
// Monitors for suggestions and automatically provides research-backed analysis

const fs = require('fs');
const path = require('path');
const WMACSResearchAdvisor = require('./wmacs-research-advisor.js');

class WMACSAutoAdvisor {
  constructor() {
    this.advisor = new WMACSResearchAdvisor();
    this.advisor.loadKnowledgeBase();
    
    this.suggestionPatterns = [
      /let'?s?\s+(remove|delete|get rid of)/i,
      /we should\s+(remove|delete|change|switch)/i,
      /can you\s+(remove|delete|implement|add)/i,
      /i think we should/i,
      /what if we/i,
      /maybe we could/i,
      /we could try/i,
      /how about/i,
      /why don'?t we/i,
      /it would be better to/i,
      /we need to\s+(remove|change|fix|optimize)/i
    ];
    
    this.riskKeywords = [
      'remove', 'delete', 'get rid of', 'eliminate',
      'switch', 'change', 'replace', 'migrate',
      'optimize', 'simplify', 'streamline',
      'token', 'cost', 'efficiency', 'performance'
    ];
  }

  /**
   * Analyzes text for suggestions that need research
   */
  detectSuggestions(text) {
    const suggestions = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      
      // Check for suggestion patterns
      const matchesPattern = this.suggestionPatterns.some(pattern => 
        pattern.test(trimmed)
      );
      
      // Check for risk keywords
      const hasRiskKeywords = this.riskKeywords.some(keyword => 
        trimmed.toLowerCase().includes(keyword)
      );
      
      if (matchesPattern || hasRiskKeywords) {
        suggestions.push({
          text: trimmed,
          confidence: matchesPattern ? 'high' : 'medium',
          riskLevel: this.assessRiskLevel(trimmed)
        });
      }
    }
    
    return suggestions;
  }

  /**
   * Assesses risk level of a suggestion
   */
  assessRiskLevel(suggestion) {
    const highRiskWords = ['remove', 'delete', 'eliminate', 'switch database', 'change architecture'];
    const mediumRiskWords = ['optimize', 'change', 'replace', 'migrate'];
    
    const lowerSuggestion = suggestion.toLowerCase();
    
    if (highRiskWords.some(word => lowerSuggestion.includes(word))) {
      return 'high';
    } else if (mediumRiskWords.some(word => lowerSuggestion.includes(word))) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Automatically analyzes detected suggestions
   */
  async autoAnalyze(text, context = {}) {
    const suggestions = this.detectSuggestions(text);
    
    if (suggestions.length === 0) {
      return { analyzed: false, message: 'No suggestions detected requiring analysis' };
    }

    console.log('🤖 WMACS Auto-Advisor: Detected suggestions requiring analysis...');
    
    const analyses = [];
    
    for (const suggestion of suggestions) {
      if (suggestion.riskLevel === 'high' || suggestion.confidence === 'high') {
        console.log(`\n⚠️  HIGH-PRIORITY ANALYSIS REQUIRED:`);
        console.log(`   Suggestion: "${suggestion.text}"`);
        console.log(`   Risk Level: ${suggestion.riskLevel}`);
        console.log(`   Confidence: ${suggestion.confidence}`);
        
        const analysis = await this.advisor.analyzeSuggestion(suggestion.text, context);
        analyses.push({
          suggestion: suggestion.text,
          analysis,
          priority: 'high'
        });
        
        // Auto-display critical pushback
        if (analysis.decision === 'PUSHBACK_WITH_ALTERNATIVES') {
          console.log('\n🛑 AUTOMATIC PUSHBACK TRIGGERED:');
          console.log(`   Decision: ${analysis.decision}`);
          console.log(`   Confidence: ${analysis.confidence}`);
          console.log('   Key Issues:');
          analysis.reasoning.slice(0, 3).forEach(reason => {
            console.log(`     - ${reason}`);
          });
          
          if (analysis.alternatives.length > 0) {
            console.log('   Recommended Alternative:');
            console.log(`     ${analysis.alternatives[0].alternative}: ${analysis.alternatives[0].description}`);
          }
        }
      }
    }
    
    return {
      analyzed: true,
      suggestionsCount: suggestions.length,
      highPriorityCount: analyses.length,
      analyses
    };
  }

  /**
   * Monitors conversation for suggestions (simulated)
   */
  async monitorConversation(conversationText, context = {}) {
    console.log('👁️  WMACS Auto-Advisor: Monitoring conversation...');
    
    const result = await this.autoAnalyze(conversationText, context);
    
    if (result.analyzed && result.highPriorityCount > 0) {
      console.log(`\n📊 Auto-Analysis Summary:`);
      console.log(`   - Total suggestions detected: ${result.suggestionsCount}`);
      console.log(`   - High-priority analyses: ${result.highPriorityCount}`);
      console.log(`   - Pushback recommendations: ${result.analyses.filter(a => a.analysis.decision === 'PUSHBACK_WITH_ALTERNATIVES').length}`);
      
      // Save analysis results
      this.saveAnalysisResults(result);
    }
    
    return result;
  }

  /**
   * Saves analysis results for review
   */
  saveAnalysisResults(result) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `.wmacs/auto-analysis-${timestamp}.json`;
    
    try {
      fs.writeFileSync(filename, JSON.stringify(result, null, 2));
      console.log(`📁 Analysis saved to: ${filename}`);
    } catch (error) {
      console.log('⚠️  Could not save analysis results:', error.message);
    }
  }

  /**
   * Integration hook for conversation systems
   */
  static async analyzeUserInput(userInput, context = {}) {
    const autoAdvisor = new WMACSAutoAdvisor();
    return await autoAdvisor.monitorConversation(userInput, context);
  }
}

// CLI usage
if (require.main === module) {
  const [,, command, ...args] = process.argv;
  
  switch (command) {
    case 'monitor':
      const text = args.join(' ');
      WMACSAutoAdvisor.analyzeUserInput(text)
        .then(result => {
          if (!result.analyzed) {
            console.log('✅ No high-risk suggestions detected');
          }
        })
        .catch(error => console.error('❌ Auto-analysis failed:', error.message));
      break;
      
    case 'test':
      const testSuggestions = [
        "Let's remove the authentication middleware to simplify things",
        "We should switch from PostgreSQL to MongoDB for better performance",
        "Can you delete all the old migration files?",
        "I think we should optimize by removing indexes",
        "Maybe we could get rid of the multi-agent system for token efficiency"
      ];
      
      console.log('🧪 Testing Auto-Advisor with sample suggestions...\n');
      
      testSuggestions.forEach(async (suggestion, index) => {
        console.log(`--- Test ${index + 1} ---`);
        await WMACSAutoAdvisor.analyzeUserInput(suggestion);
        console.log('');
      });
      break;
      
    default:
      console.log('Usage: node wmacs-auto-advisor.js [monitor|test] [text...]');
      console.log('  monitor "user input text" - Monitor text for suggestions');
      console.log('  test - Run tests with sample suggestions');
  }
}

module.exports = WMACSAutoAdvisor;
