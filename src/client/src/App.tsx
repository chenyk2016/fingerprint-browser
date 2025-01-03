import React, { useState, useEffect } from 'react';
import BrowserForm from './components/BrowserForm';
import BrowserList from './components/BrowserList';

interface Browser {
  configName: string;
  browserType: string;
  headless: boolean;
  status?: string;
}

interface BrowserFormData {
  browserType: string;
  headless: boolean;
  [key: string]: any;
}

function App(): React.ReactElement {
  const [browsers, setBrowsers] = useState<Browser[]>([]);

  useEffect(() => {
    fetchBrowsers();
  }, []);

  const fetchBrowsers = async (): Promise<void> => {
    try {
      const response = await fetch('/api/browsers');
      const data = await response.json();
      setBrowsers(data);
    } catch (error) {
      console.error('Error fetching browsers:', error);
    }
  };

  const handleAddBrowser = async (browserData: BrowserFormData): Promise<void> => {
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

  const handleDeleteBrowser = async (configName: string): Promise<void> => {
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

  const handleStartBrowser = async (configName: string): Promise<void> => {
    try {
      const response = await fetch(`/api/browsers/${configName}/start`, {
        method: 'POST',
      });
      if (response.ok) {
        fetchBrowsers();
      }
    } catch (error) {
      console.error('Error starting browser:', error);
    }
  };

  const handleStopBrowser = async (configName: string): Promise<void> => {
    try {
      const response = await fetch(`/api/browsers/${configName}/stop`, {
        method: 'POST',
      });
      if (response.ok) {
        fetchBrowsers();
      }
    } catch (error) {
      console.error('Error stopping browser:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">浏览器环境管理</h1>
      <BrowserForm onSubmit={handleAddBrowser} />
      <BrowserList 
        browsers={browsers} 
        onDelete={handleDeleteBrowser}
        onStart={handleStartBrowser}
        onStop={handleStopBrowser}
      />
    </div>
  );
}

export default App; 