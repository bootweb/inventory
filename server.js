import express from 'express';

import config from './config';
import inventoryRoutes from './routes/inventoryRoutes';

const server = express();

// Parse POST json data
server.use(express.json());

// Get req to web app
server.get('/', (req, res) => {
	res.send('Welcome! Purchase high quality face masks and gloves from us');
});

// API requests handled by this route
server.use('/api', inventoryRoutes);

// Listen server
server.listen(config.port, config.host, () => {
	console.info('Express listening on port', config.port);
});