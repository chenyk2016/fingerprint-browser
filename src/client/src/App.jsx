import React, { useState, useEffect } from 'react';
import BrowserForm from './components/BrowserForm';
import BrowserList from './components/BrowserList';

function App() {
  const [browsers, setBrowsers] = useState([]);

  useEffect(() => {
    fetchBrowsers();
  }, []);

  const fetchBrowsers = async () => {
    try {
      const response = await fetch('/api/browsers');
      const data = await response.json();
      setBrowsers(data);
    } catch (error) {
      console.error('Error fetching browsers:', error);
    }
  };

  const handleAddBrowser = async (browserData) => {
    try {
      const response = await fetch('/api/browsers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(browserData),
      });
      if (response.ok) {
        fetchBrowsers();
      }
    } catch (error) {
      console.error('Error adding browser:', error);
    }
  };

  const handleDeleteBrowser = async (configName) => {
    try {
      const response = await fetch(`/api/browsers/${configName}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchBrowsers();
      }
    } catch (error) {
      console.error('Error deleting browser:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">浏览器环境管理</h1>
      <BrowserForm onSubmit={handleAddBrowser} />
      <BrowserList browsers={browsers} onDelete={handleDeleteBrowser} />
    </div>
  );
}

export default App; 