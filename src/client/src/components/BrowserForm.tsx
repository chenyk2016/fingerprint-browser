import React, { useState } from 'react';
import { BrowserFormData } from '../types/browser';

interface BrowserFormProps {
  onSubmit: (data: BrowserFormData) => Promise<void>;
}

function BrowserForm({ onSubmit }: BrowserFormProps): React.ReactElement {
  const [browserType, setBrowserType] = useState<string>('chrome');
  const [headless, setHeadless] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await onSubmit({
      browserType,
      headless
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-xl font-semibold mb-4">创建新的浏览器环境</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">浏览器类型</label>
          <select
            value={browserType}
            onChange={(e) => setBrowserType(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="chrome">Chrome</option>
            <option value="firefox">Firefox</option>
          </select>
        </div>
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={headless}
              onChange={(e) => setHeadless(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">无头模式</span>
          </label>
        </div>
        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          创建
        </button>
      </div>
    </form>
  );
}

export default BrowserForm; 