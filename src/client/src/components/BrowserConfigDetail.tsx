import React, { useState } from 'react';
import { BrowserConfig } from '../types/browser';

interface BrowserConfigDetailProps {
  config: BrowserConfig & { configName: string };
  onClose: () => void;
  onSave: (config: BrowserConfig) => void;
}

function BrowserConfigDetail({ config, onClose, onSave }: BrowserConfigDetailProps): React.ReactElement {
  const [editedConfig, setEditedConfig] = useState<string>(JSON.stringify(config, null, 2));
  const [error, setError] = useState<string | null>(null);

  const handleSave = (): void => {
    try {
      const parsedConfig = JSON.parse(editedConfig) as BrowserConfig;
      onSave(parsedConfig);
      setError(null);
    } catch (err) {
      setError('JSON 格式错误');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">浏览器配置详情</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            type="button"
          >
            关闭
          </button>
        </div>
        
        <div className="p-4 flex-grow overflow-auto">
          {error && (
            <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          <textarea
            value={editedConfig}
            onChange={(e) => setEditedConfig(e.target.value)}
            className="w-full h-[60vh] font-mono text-sm p-2 border rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            spellCheck="false"
          />
        </div>

        <div className="p-4 border-t flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
            type="button"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            type="button"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

export default BrowserConfigDetail; 