{
	"info": {
		"_postman_id": "773597da-6a70-4a17-ad1a-455d0a80bf2d",
		"name": "RajaOngkir Collection",
		"description": "**Description:**\n\nThis Postman Collection provides a complete set of pre-configured requests for testing and exploring the **RajaOngkir API**, which offers shipping cost calculations, courier services data, and location-based information (such as provinces, cities, districts, and subdistricts).\n\nIt is designed to help developers, partners, and integrators easily:\n\n- Simulate domestic shipping cost calculations\n    \n- Retrieve available courier services\n    \n- Access structured location data (province to subdistrict)\n    \n- Speed up development by using ready-to-use request samples\n    \n\nAll requests are grouped by functionality and include environment variables and headers for a seamless testing experience.",
		"schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
		"_exporter_id": "34750650"
	},
	"item": [
		{
			"name": "Search Domestic Destination",
			"request": {
				"method": "GET",
				"header": [
					{
						"key": "key",
						"value": "API KEY"
					}
				],
				"url": {
					"raw": "https://rajaongkir.komerce.id/api/v1/destination/domestic-destination?search=kebon kelapa&limit=10&offset=0",
					"protocol": "https",
					"host": [
						"rajaongkir",
						"komerce",
						"id"
					],
					"path": [
						"api",
						"v1",
						"destination",
						"domestic-destination"
					],
					"query": [
						{
							"key": "search",
							"value": "kebon kelapa"
						},
						{
							"key": "limit",
							"value": "10"
						},
						{
							"key": "offset",
							"value": "0"
						}
					]
				}
			},
			"response": []
		},
		{
			"name": "Search International Destination",
			"request": {
				"method": "GET",
				"header": [
					{
						"key": "key",
						"value": "YOUR_API_KEY"
					}
				],
				"url": {
					"raw": "https://rajaongkir.komerce.id/api/v1/destination/international-destination?search=malaysia&limit=20&offset=0",
					"protocol": "https",
					"host": [
						"rajaongkir",
						"komerce",
						"id"
					],
					"path": [
						"api",
						"v1",
						"destination",
						"international-destination"
					],
					"query": [
						{
							"key": "search",
							"value": "malaysia"
						},
						{
							"key": "limit",
							"value": "20"
						},
						{
							"key": "offset",
							"value": "0"
						}
					]
				}
			},
			"response": []
		},
		{
			"name": "Calculate Domestic Cost",
			"request": {
				"method": "POST",
				"header": [
					{
						"key": "key",
						"value": "YOUR_API_KEY"
					},
					{
						"key": "Content-Type",
						"value": "application/x-www-form-urlencoded"
					}
				],
				"body": {
					"mode": "urlencoded",
					"urlencoded": [
						{
							"key": "origin",
							"value": "31555",
							"type": "text"
						},
						{
							"key": "destination",
							"value": "68423",
							"type": "text"
						},
						{
							"key": "weight",
							"value": "1000",
							"type": "text"
						},
						{
							"key": "courier",
							"value": "jne:sicepat:ide:sap:jnt:ninja:tiki:lion:anteraja:pos:ncs:rex:rpx:sentral:star:wahana:dse",
							"type": "text"
						},
						{
							"key": "price",
							"value": "lowest",
							"type": "text"
						}
					]
				},
				"url": {
					"raw": "https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost",
					"protocol": "https",
					"host": [
						"rajaongkir",
						"komerce",
						"id"
					],
					"path": [
						"api",
						"v1",
						"calculate",
						"domestic-cost"
					]
				}
			},
			"response": []
		},
		{
			"name": "Calculate International Cost",
			"request": {
				"method": "POST",
				"header": [
					{
						"key": "key",
						"value": "YOUR_API_KEY"
					},
					{
						"key": "Content-Type",
						"value": "application/x-www-form-urlencoded"
					}
				],
				"body": {
					"mode": "urlencoded",
					"urlencoded": [
						{
							"key": "courier",
							"value": "tiki:lion:pos:expedito:ray:jne",
							"type": "text"
						},
						{
							"key": "origin",
							"value": "17521",
							"type": "text"
						},
						{
							"key": "destination",
							"value": "152",
							"type": "text"
						},
						{
							"key": "weight",
							"value": "500",
							"type": "text"
						},
						{
							"key": "price",
							"value": "lowest",
							"type": "text"
						}
					]
				},
				"url": {
					"raw": "https://rajaongkir.komerce.id/api/v1/calculate/international-cost",
					"protocol": "https",
					"host": [
						"rajaongkir",
						"komerce",
						"id"
					],
					"path": [
						"api",
						"v1",
						"calculate",
						"international-cost"
					]
				}
			},
			"response": []
		},
		{
			"name": "Tracking Airwaybills",
			"request": {
				"method": "POST",
				"header": [
					{
						"key": "key",
						"value": "YOUR_API_KEY"
					}
				],
				"url": {
					"raw": "https://rajaongkir.komerce.id/api/v1/track/waybill?awb=MT685U91&courier=",
					"protocol": "https",
					"host": [
						"rajaongkir",
						"komerce",
						"id"
					],
					"path": [
						"api",
						"v1",
						"track",
						"waybill"
					],
					"query": [
						{
							"key": "awb",
							"value": "MT685U91"
						},
						{
							"key": "courier",
							"value": ""
						}
					]
				}
			},
			"response": []
		}
	]
}