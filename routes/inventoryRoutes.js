import express from 'express';
import {check} from 'express-validator';

import itemController from '../controllers/itemController';

const router = express.Router();

// Post request to purchaseItems
// router.post('/', [
// 		check('country').not().isEmpty(),
// 		check('gloveQuantity').not().isEmpty(),
// 		check('maskQuantity').not().isEmpty()
// 	], itemController.purchaseItems);
router.post('/', [
		check('input').not().isEmpty()
	], itemController.purchaseItems);

export default router;