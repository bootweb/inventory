import {validationResult} from 'express-validator';

const purchaseItems = (req, res, next) => {
	let {input} = req.body;
	
	// validation result
	const errors = validationResult(req);
	if(!errors.isEmpty()) {
		return res.json({
			message: 'Could not process your order, please check your input'
		});
	}

	const extractedData = input.split(":");
	let [country, passportNumber, gloveQuantity, maskQuantity] = "";

	if (extractedData.length === 6) {
		country = extractedData[0];
		passportNumber = extractedData[1];
		gloveQuantity = +extractedData[3];
		maskQuantity = +extractedData[5];
	}
	// Passport number which is optional not provided
	if (extractedData.length === 5) {
		country = extractedData[0];
		gloveQuantity = +extractedData[2];
		maskQuantity = +extractedData[4];
	}
	
	// if gloveQuantity and maskQuantity both are 0
	if (gloveQuantity === 0 && maskQuantity === 0) {
		return res.json({
			message: 'Either of product quantity should be greater than 0'
		})
	}

	// convert country input to lower case to avoid case sensitive issues
	country = country.toLowerCase();

	// Pricing declaration
	const glovePriceUK = 100;
	const maskPriceUK = 65;
	const glovePriceGermany = 150;
	const maskPriceGermany = 100;

	// Inventory Details
	let gloveStockUK = 100;
	let maskStockUK = 100;
	let gloveStockGermany = 50;
	let maskStockGermany = 100;

	// Inventory check, if we have sufficient glove quantity asked by visitor
	if (gloveQuantity > gloveStockUK + gloveStockGermany) {
		return res.json({
			message: 'Order failed. Glove quantity requested cannot be fulfilled.',
			output: `OUT_OF_STOCK:${maskStockUK}:${maskStockGermany}:${gloveStockUK}:${gloveStockGermany}`
		})
	}

	// Inventory check, if we have sufficient mask quantity asked by visitor
	if (maskQuantity > maskStockUK + maskStockGermany) {
		return res.json({
			message: 'Order failed. Mask quantity requested cannot be fulfilled.',
			output: `OUT_OF_STOCK:${maskStockUK}:${maskStockGermany}:${gloveStockUK}:${gloveStockGermany}`
		})
	}

	let TotalPrice;
	let output;
	let maskImportNeeded = 0;
	let gloveImportNeeded = 0;
	let shippingRoundsForGlove = 0;
	let shippingRoundsForMask = 0;
	let shippingCostForGlove = 0;
	let shippingCostForMask = 0;
	let importedGlovePrice = 0;
	let totalImportedPriceForGlove = 0;
	let importedMaskPrice = 0;
	let totalImportedPriceForMask = 0;
	let maskConsumedFromUK = 0;
	let gloveConsumedFromUK = 0;
	let maskConsumedFromGermany = 0;
	let gloveConsumedFromGermany = 0;
	
	// If country is UK
	if (country === 'uk') {

		// Quantity asked can be fulfilled by UK itself
		if (gloveQuantity <= gloveStockUK && maskQuantity <= maskStockUK) {

			TotalPrice = gloveQuantity * glovePriceUK + maskQuantity * maskPriceUK;
			output = `${TotalPrice}:${maskStockUK - maskQuantity}:${maskStockGermany}:${gloveStockUK - gloveQuantity}:${gloveStockGermany}`;
			
			return res.json({
				message: 'Order placed, thank you!',
				total_price: `${TotalPrice}`,
				ukMaskInventory: `${maskStockUK - maskQuantity}`,
				germanyMaskInventory: `${maskStockGermany}`,
				ukGloveInventory: `${gloveStockUK - gloveQuantity}`,
				germanyGloveInventory: `${gloveStockGermany}`,
				output: output
			});
		}

		// Check how many item needs to be imported
		if (gloveQuantity > gloveStockUK) {
			gloveImportNeeded = gloveQuantity - gloveStockUK;
			importedGlovePrice = glovePriceGermany * gloveImportNeeded;
			// total shipping cost for glove
			shippingRoundsForGlove = Math.ceil(gloveImportNeeded / 10);
			shippingCostForGlove = 400 * shippingRoundsForGlove;
			// Glove stock from uk exhausted so assign it 0
			gloveConsumedFromUK = gloveStockUK;
			gloveStockUK = 0;
		} else {
			// update glove inventory uk
			gloveConsumedFromUK = gloveQuantity;
			gloveStockUK = gloveStockUK - gloveQuantity;
		}
		if (maskQuantity > maskStockUK) {
			maskImportNeeded = maskQuantity - maskStockUK;
			importedMaskPrice = maskPriceGermany * maskImportNeeded;
			// total shipping cost for mask
			shippingRoundsForMask = Math.ceil(maskImportNeeded / 10);
			shippingCostForMask = 400 * shippingRoundsForMask;
			// Mask stock from uk exhausted so assign it 0
			maskConsumedFromUK = maskStockUK;
			maskStockUK = 0;
		} else {
			// update mask inventory uk
			maskConsumedFromUK = maskQuantity;
			maskStockUK = maskStockUK - maskQuantity;
		}

		// If passport number field is entered
		if (passportNumber) {
			// german passport(since importing from germany, local in this case)
			if (passportNumber.charAt(0) === 'A' || passportNumber.charAt(0) === 'a') {
				// 20% off on shippingcharges
				shippingCostForGlove = (400 * 0.8) * shippingRoundsForGlove;
				shippingCostForMask = (400 * 0.8) * shippingRoundsForMask;
			}
		}

		// If quantity cannot be fulfilled by UK alone and passport number not entered, no need to offer any discount on transport cost
		if (gloveQuantity > gloveStockUK || maskQuantity > maskStockUK) {
			
			totalImportedPriceForGlove = importedGlovePrice + shippingCostForGlove;
			totalImportedPriceForMask = importedMaskPrice + shippingCostForMask;
			TotalPrice = (gloveConsumedFromUK * glovePriceUK) + (maskConsumedFromUK * maskPriceUK) + totalImportedPriceForGlove + totalImportedPriceForMask;
			output = `${TotalPrice}:${maskStockUK}:${maskStockGermany - maskImportNeeded}:${gloveStockUK}:${gloveStockGermany - gloveImportNeeded}`;

			return res.json({
				message: 'Order placed, thank you!',
				total_price: `${TotalPrice}`,
				ukMaskInventory: `${maskStockUK}`,
				germanyMaskInventory: `${maskStockGermany - maskImportNeeded}`,
				ukGloveInventory: `${gloveStockUK}`,
				germanyGloveInventory: `${gloveStockGermany - gloveImportNeeded}`,
				output: output
			});
		}
		
	}

	// If country is Germany
	if (country === 'germany') {

		// Quantity asked can be fulfilled by Germany itself
		if (gloveQuantity <= gloveStockGermany && maskQuantity <= maskStockGermany) {
			
			TotalPrice = gloveQuantity*glovePriceGermany + maskQuantity*maskPriceGermany;
			output = `${TotalPrice}:${maskStockUK}:${maskStockGermany - maskQuantity}:${gloveStockUK}:${gloveStockGermany - gloveQuantity}`;
			
			return res.json({
				message: 'Order placed, thank you!',
				total_price: `${TotalPrice}`,
				ukMaskInventory: `${maskStockUK}`,
				germanyMaskInventory: `${maskStockGermany - maskQuantity}`,
				ukGloveInventory: `${gloveStockUK}`,
				germanyGloveInventory: `${gloveStockGermany - gloveQuantity}`,
				output: output
			});
		}

		// Check how many item needs to be imported
		if (gloveQuantity > gloveStockGermany) {
			gloveImportNeeded = gloveQuantity - gloveStockGermany;
			importedGlovePrice = glovePriceUK * gloveImportNeeded;
			// total shipping cost for glove
			shippingRoundsForGlove = Math.ceil(gloveImportNeeded / 10);
			shippingCostForGlove = 400 * shippingRoundsForGlove;
			// Glove stock from germany exhausted so assign it 0
			gloveConsumedFromGermany = gloveStockGermany;
			gloveStockGermany = 0;
		} else {
			// update glove inventory germany
			gloveConsumedFromGermany = gloveQuantity;
			gloveStockUK = gloveStockGermany - gloveQuantity;
		}
		if (maskQuantity > maskStockGermany) {
			maskImportNeeded = maskQuantity - maskStockGermany;
			importedMaskPrice = maskPriceUK * maskImportNeeded;
			// total shipping cost for mask
			shippingRoundsForMask = Math.ceil(maskImportNeeded / 10);
			shippingCostForMask = 400 * shippingRoundsForMask;
			// Mask stock from germany exhausted so assign it 0
			maskConsumedFromGermany = maskStockGermany;
			maskStockGermany = 0;
		} else {
			// update mask inventory germany
			maskConsumedFromGermany = maskQuantity;
			maskStockGermany = maskStockGermany - maskQuantity;
		}

		// If passport number field is entered
		if (passportNumber) {
			// uk passport(local in this case)
			if (passportNumber.charAt(0) === 'B' || passportNumber.charAt(0) === 'b') {
				// 20% off on shippingcharges
				shippingCostForGlove = (400 * 0.8) * shippingRoundsForGlove;
				shippingCostForMask = (400 * 0.8) * shippingRoundsForMask;
			}
		}

		// If quantity cannot be fulfilled by Germany alone and passport number not entered, no need to offer any discount on transport cost
		if (gloveQuantity > gloveStockGermany || maskQuantity > maskStockGermany) {

			totalImportedPriceForGlove = importedGlovePrice + shippingCostForGlove;
			totalImportedPriceForMask = importedMaskPrice + shippingCostForMask;

			TotalPrice = (gloveConsumedFromGermany * glovePriceGermany) + (maskConsumedFromGermany * maskPriceGermany) + totalImportedPriceForGlove + totalImportedPriceForMask;
			output = `${TotalPrice}:${maskStockUK - maskImportNeeded}:${maskStockGermany}:${gloveStockUK - gloveImportNeeded}:${gloveStockGermany}`;

			return res.json({
				message: 'Order placed, thank you!',
				total_price: `${TotalPrice}`,
				ukMaskInventory: `${maskStockUK - maskImportNeeded}`,
				germanyMaskInventory: `${maskStockGermany}`,
				ukGloveInventory: `${gloveStockUK - gloveImportNeeded}`,
				germanyGloveInventory: `${gloveStockGermany}`,
				output: output
			});
		}
		
	}

	// unhandled properly
	res.json({
		message: 'Unhandled properly by api',
		input: input
	});
};

export default {purchaseItems};