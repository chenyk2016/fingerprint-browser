import React, { useState } from 'react';

interface Browser {
  configName: string;
  browserType: string;
  headless: boolean;
  status?: string;
}

interface BrowserListProps {
  browsers: Browser[];
  onDelete: (configName: string) => void;
  onStart: (configName: string) => Promise<void>;
  onStop: (configName: string) => Promise<void>;
}

function BrowserList({ browsers, onDelete, onStart, onStop }: BrowserListProps): React.ReactElement {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const handleStart = async (configName: string) => {
    try {
      setLoadingStates(prev => ({ ...prev, [configName]: true }));
      await onStart(configName);
    } catch (error) {
      console.error('Failed to start browser:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, [configName]: false }));
    }
  };

  const handleStop = async (configName: string) => {
    try {
      setLoadingStates(prev => ({ ...prev, [configName]: true }));
      await onStop(configName);
    } catch (error) {
      console.error('Failed to stop browser:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, [configName]: false }));
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'running':
        return 'text-green-600';
      case 'stopped':
        return 'text-gray-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">现有浏览器环境</h2>
      <div className="space-y-4">
        {browsers.map((browser) => (
          <div
            key={browser.configName}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
          >
            <div>
              <h3 className="font-medium">{browser.configName}</h3>
              <div className="text-sm text-gray-500">
                <p>类型: {browser.browserType}</p>
                <p>无头模式: {browser.headless ? '是' : '否'}</p>
                <p className={getStatusColor(browser.status)}>
                  状态: {loadingStates[browser.configName] ? '处理中...' : (browser.status || '未启动')}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {(!browser.status || browser.status === 'stopped') && (
                <button
                  onClick={() => handleStart(browser.configName)}
                  disabled={loadingStates[browser.configName]}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    loadingStates[browser.configName]
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'text-green-600 hover:bg-green-100'
                  }`}
                >
                  {loadingStates[browser.configName] ? '启动中...' : '启动'}
                </button>
              )}
              {browser.status === 'running' && (
                <button
                  onClick={() => handleStop(browser.configName)}
                  disabled={loadingStates[browser.configName]}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    loadingStates[browser.configName]
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'text-yellow-600 hover:bg-yellow-100'
                  }`}
                >
                  {loadingStates[browser.configName] ? '关闭中...' : '关闭'}
                </button>
              )}
              <button
                onClick={() => onDelete(browser.configName)}
                disabled={loadingStates[browser.configName]}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  loadingStates[browser.configName]
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'text-red-600 hover:bg-red-100'
                }`}
              >
                删除
              </button>
            </div>
          </div>
        ))}
        {browsers.length === 0 && (
          <p className="text-gray-500 text-center py-4">暂无浏览器环境</p>
        )}
      </div>
    </div>
  );
}

export default BrowserList; 