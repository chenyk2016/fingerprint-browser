import React from 'react';

function BrowserList({ browsers, onDelete, onStart, onStop }) {
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
                <p>状态: {browser.status || '未启动'}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {(!browser.status || browser.status === 'stopped') && (
                <button
                  onClick={() => onStart(browser.configName)}
                  className="px-3 py-1 text-sm text-green-600 hover:bg-green-100 rounded-md"
                >
                  启动
                </button>
              )}
              {browser.status === 'running' && (
                <button
                  onClick={() => onStop(browser.configName)}
                  className="px-3 py-1 text-sm text-yellow-600 hover:bg-yellow-100 rounded-md"
                >
                  关闭
                </button>
              )}
              <button
                onClick={() => onDelete(browser.configName)}
                className="px-3 py-1 text-sm text-red-600 hover:bg-red-100 rounded-md"
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