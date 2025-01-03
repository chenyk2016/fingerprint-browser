import React, { useState } from 'react';

function BrowserForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    browserType: 'chrome',
    configName: '',
    headless: false,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      browserType: 'chrome',
      configName: '',
      headless: false,
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-xl font-semibold mb-4">添加新浏览器环境</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">浏览器类型</label>
          <select
            name="browserType"
            value={formData.browserType}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="chrome">Chrome</option>
            <option value="firefox">Firefox</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">配置名称</label>
          <input
            type="text"
            name="configName"
            value={formData.configName}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="例如: profile1"
            required
          />
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            name="headless"
            checked={formData.headless}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label className="ml-2 block text-sm text-gray-700">无头模式</label>
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          添加环境
        </button>
      </form>
    </div>
  );
}

export default BrowserForm; 