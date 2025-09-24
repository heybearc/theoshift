'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  fromName: string;
  fromEmail: string;
  isConfigured: boolean;
}

interface TestEmailForm {
  toEmail: string;
  subject: string;
  message: string;
}

export default function EmailConfigPage() {
  const [config, setConfig] = useState<EmailConfig>({
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPassword: '',
    fromName: 'JW Attendant Scheduler',
    fromEmail: '',
    isConfigured: false
  });

  const [testForm, setTestForm] = useState<TestEmailForm>({
    toEmail: '',
    subject: 'Test Email from JW Attendant Scheduler',
    message: 'This is a test email to verify the email configuration is working correctly.'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testResult, setTestResult] = useState('');

  useEffect(() => {
    fetchEmailConfig();
  }, []);

  const fetchEmailConfig = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/admin/email-config');
      const data = await response.json();

      if (data.success) {
        setConfig(data.data.config);
      } else {
        setError(data.error || 'Failed to fetch email configuration');
      }
    } catch (err) {
      setError('Error loading email configuration');
      console.error('Error fetching email config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  const handleTestFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTestForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/email-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message || 'Email configuration saved successfully!');
        if (data.note) {
          setSuccess(prev => `${prev}\n\nNote: ${data.note}`);
        }
      } else {
        setError(data.error || 'Failed to save email configuration');
      }
    } catch (err) {
      setError('Error saving email configuration');
      console.error('Error saving config:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setTestResult('');
    setError('');

    try {
      const response = await fetch('/api/admin/email-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testForm)
      });

      const data = await response.json();

      if (data.success) {
        setTestResult(`✅ ${data.message}`);
      } else {
        setTestResult(`❌ ${data.error || 'Failed to send test email'}`);
      }
    } catch (err) {
      setTestResult('❌ Error sending test email');
      console.error('Error testing email:', err);
    } finally {
      setTesting(false);
    }
  };

  const presetConfigs = [
    {
      name: 'Gmail',
      config: {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpSecure: false
      }
    },
    {
      name: 'Outlook/Hotmail',
      config: {
        smtpHost: 'smtp-mail.outlook.com',
        smtpPort: 587,
        smtpSecure: false
      }
    },
    {
      name: 'Yahoo',
      config: {
        smtpHost: 'smtp.mail.yahoo.com',
        smtpPort: 587,
        smtpSecure: false
      }
    }
  ];

  const applyPreset = (preset: typeof presetConfigs[0]) => {
    setConfig(prev => ({
      ...prev,
      ...preset.config
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-lg text-gray-600">Loading email configuration...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Email Configuration</h1>
          <p className="text-gray-600">Configure SMTP settings for sending invitation emails</p>
        </div>
        <Link
          href="/admin"
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          ← Back to Admin
        </Link>
      </div>

      {/* Status Banner */}
      <div className={`rounded-lg p-4 ${config.isConfigured 
        ? 'bg-green-50 border border-green-200' 
        : 'bg-yellow-50 border border-yellow-200'
      }`}>
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{config.isConfigured ? '✅' : '⚠️'}</span>
          <div>
            <h3 className={`font-medium ${config.isConfigured ? 'text-green-800' : 'text-yellow-800'}`}>
              {config.isConfigured ? 'Email Configuration Active' : 'Email Configuration Required'}
            </h3>
            <p className={`text-sm ${config.isConfigured ? 'text-green-600' : 'text-yellow-600'}`}>
              {config.isConfigured 
                ? 'Email invitations and notifications are enabled.'
                : 'Configure SMTP settings to enable email functionality.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg whitespace-pre-line">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Preset Configurations */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Setup Presets</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {presetConfigs.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="font-medium text-gray-900">{preset.name}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {preset.config.smtpHost}:{preset.config.smtpPort}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* SMTP Configuration */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <form onSubmit={handleSaveConfig} className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">SMTP Configuration</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="smtpHost" className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Host *
                  </label>
                  <input
                    type="text"
                    id="smtpHost"
                    name="smtpHost"
                    value={config.smtpHost}
                    onChange={handleConfigChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <label htmlFor="smtpPort" className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Port *
                  </label>
                  <input
                    type="number"
                    id="smtpPort"
                    name="smtpPort"
                    value={config.smtpPort}
                    onChange={handleConfigChange}
                    required
                    min="1"
                    max="65535"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="587"
                  />
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="smtpSecure"
                  name="smtpSecure"
                  checked={config.smtpSecure}
                  onChange={handleConfigChange}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div>
                  <label htmlFor="smtpSecure" className="text-sm font-medium text-gray-700">
                    Use SSL/TLS
                  </label>
                  <p className="text-sm text-gray-500">
                    Enable for port 465. Use STARTTLS for ports 587/25.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="smtpUser" className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Username *
                  </label>
                  <input
                    type="email"
                    id="smtpUser"
                    name="smtpUser"
                    value={config.smtpUser}
                    onChange={handleConfigChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your-email@gmail.com"
                  />
                </div>
                <div>
                  <label htmlFor="smtpPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Password *
                  </label>
                  <input
                    type="password"
                    id="smtpPassword"
                    name="smtpPassword"
                    value={config.smtpPassword}
                    onChange={handleConfigChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="App password or account password"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="fromName" className="block text-sm font-medium text-gray-700 mb-2">
                    From Name *
                  </label>
                  <input
                    type="text"
                    id="fromName"
                    name="fromName"
                    value={config.fromName}
                    onChange={handleConfigChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="JW Attendant Scheduler"
                  />
                </div>
                <div>
                  <label htmlFor="fromEmail" className="block text-sm font-medium text-gray-700 mb-2">
                    From Email *
                  </label>
                  <input
                    type="email"
                    id="fromEmail"
                    name="fromEmail"
                    value={config.fromEmail}
                    onChange={handleConfigChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="noreply@example.com"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
                >
                  {saving ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </div>
                  ) : (
                    '💾 Save Configuration'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Test Email Sidebar */}
        <div className="space-y-6">
          {/* Test Email Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Email</h3>
            <form onSubmit={handleTestEmail} className="space-y-4">
              <div>
                <label htmlFor="toEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Send To *
                </label>
                <input
                  type="email"
                  id="toEmail"
                  name="toEmail"
                  value={testForm.toEmail}
                  onChange={handleTestFormChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="test@example.com"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={testForm.subject}
                  onChange={handleTestFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={testForm.message}
                  onChange={handleTestFormChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={testing || !config.isConfigured}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
              >
                {testing ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending...</span>
                  </div>
                ) : (
                  '📧 Send Test Email'
                )}
              </button>
            </form>

            {testResult && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm">{testResult}</p>
              </div>
            )}
          </div>

          {/* Gmail Setup Guide */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">📧 Gmail Setup Guide</h3>
            <div className="space-y-3 text-sm text-blue-800">
              <div>
                <strong>1. Enable 2-Factor Authentication</strong>
                <p>Go to Google Account settings and enable 2FA</p>
              </div>
              <div>
                <strong>2. Generate App Password</strong>
                <p>Create an app-specific password for this application</p>
              </div>
              <div>
                <strong>3. Use App Password</strong>
                <p>Use the generated app password instead of your regular password</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
