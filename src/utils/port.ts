import net from 'net';

export function findAvailablePort(startPort: number, endPort: number = startPort + 100): Promise<number> {
  return new Promise((resolve, reject) => {
    let port = startPort;

    function tryPort() {
      const server = net.createServer();
      
      server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          port++;
          if (port <= endPort) {
            tryPort();
          } else {
            reject(new Error(`No available ports found between ${startPort} and ${endPort}`));
          }
        } else {
          reject(err);
        }
      });

      server.once('listening', () => {
        server.close(() => resolve(port));
      });

      server.listen(port);
    }

    tryPort();
  });
} 