import React, { useState } from 'react';
import BrowserConfigDetail from './BrowserConfigDetail';
import { Browser, BrowserConfig } from '../types/browser';

interface BrowserListProps {
  browsers: Browser[];
  onDelete: (configName: string) => Promise<void>;
  onStart: (configName: string) => Promise<void>;
  onStop: (configName: string) => Promise<void>;
  onUpdateConfig: (configName: string, config: BrowserConfig) => Promise<void>;
}

function BrowserList({ browsers, onDelete, onStart, onStop, onUpdateConfig }: BrowserListProps): React.ReactElement {
  const [selectedConfig, setSelectedConfig] = useState<(BrowserConfig & { configName: string }) | null>(null);
  const [startingStates, setStartingStates] = useState<Record<string, boolean>>({});
  const [stoppingStates, setStoppingStates] = useState<Record<string, boolean>>({});
  const [deletingStates, setDeletingStates] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const handleConfigClick = async (configName: string): Promise<void> => {
    try {
      const response = await fetch(`/api/browsers/${configName}/config`);
      if (!response.ok) {
        throw new Error('Failed to fetch config');
      }
      const config = await response.json() as BrowserConfig;
      setSelectedConfig({ configName, ...config });
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  const handleSaveConfig = async (configName: string, updatedConfig: BrowserConfig): Promise<void> => {
    try {
      await onUpdateConfig(configName, updatedConfig);
      setSelectedConfig(null);
    } catch (error) {
      console.error('Error updating config:', error);
    }
  };

  const handleStart = async (configName: string) => {
    try {
      setStartingStates(prev => ({ ...prev, [configName]: true }));
      await onStart(configName);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '启动失败');
    } finally {
      setStartingStates(prev => ({ ...prev, [configName]: false }));
    }
  };

  const handleStop = async (configName: string) => {
    try {
      setStoppingStates(prev => ({ ...prev, [configName]: true }));
      await onStop(configName);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '关闭失败');
    } finally {
      setStoppingStates(prev => ({ ...prev, [configName]: false }));
    }
  };

  const handleDelete = async (configName: string) => {
    try {
      setDeletingStates(prev => ({ ...prev, [configName]: true }));
      await onDelete(configName);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeletingStates(prev => ({ ...prev, [configName]: false }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">现有浏览器环境</h2>
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      <div className="space-y-4">
        {browsers.map((browser) => (
          <div
            key={browser.configName}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
            onClick={() => handleConfigClick(browser.configName)}
          >
            <div>
              <h3 className="font-medium">{browser.configName}</h3>
              <div className="text-sm text-gray-500">
                <p>类型: {browser.browserType}</p>
                <p>无头模式: {browser.headless ? '是' : '否'}</p>
                <p className={getStatusColor(browser.status)}>
                  状态: {startingStates[browser.configName] ? '启动中...' : 
                        stoppingStates[browser.configName] ? '关闭中...' : 
                        (browser.status || '未启动')}
                </p>
              </div>
            </div>
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              {(!browser.status || browser.status === 'stopped') && (
                <button
                  onClick={() => handleStart(browser.configName)}
                  className="px-3 py-1 text-sm text-green-600 hover:bg-green-100 rounded-md"
                  type="button"
                  disabled={startingStates[browser.configName]}
                >
                  {startingStates[browser.configName] ? '启动中...' : '启动'}
                </button>
              )}
              {browser.status === 'running' && (
                <button
                  onClick={() => handleStop(browser.configName)}
                  className="px-3 py-1 text-sm text-yellow-600 hover:bg-yellow-100 rounded-md"
                  type="button"
                  disabled={stoppingStates[browser.configName]}
                >
                  {stoppingStates[browser.configName] ? '关闭中...' : '关闭'}
                </button>
              )}
              <button
                onClick={() => handleDelete(browser.configName)}
                className="px-3 py-1 text-sm text-red-600 hover:bg-red-100 rounded-md"
                type="button"
                disabled={deletingStates[browser.configName]}
              >
                {deletingStates[browser.configName] ? '删除中...' : '删除'}
              </button>
            </div>
          </div>
        ))}
        {browsers.length === 0 && (
          <p className="text-gray-500 text-center py-4">暂无浏览器环境</p>
        )}
      </div>

      {selectedConfig && (
        <BrowserConfigDetail
          config={selectedConfig}
          onClose={() => setSelectedConfig(null)}
          onSave={(updatedConfig) => handleSaveConfig(selectedConfig.configName, updatedConfig)}
        />
      )}
    </div>
  );
}

function getStatusColor(status: string | undefined): string {
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
}

export default BrowserList;