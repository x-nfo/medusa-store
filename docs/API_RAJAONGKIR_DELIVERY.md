{
	"info": {
		"_postman_id": "9861e4a7-f0ff-4b29-a040-2936600b0b14",
		"name": "OpenAPI",
		"schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
		"_exporter_id": "40305110"
	},
	"item": [
		{
			"name": "Search Destination",
			"protocolProfileBehavior": {
				"disabledSystemHeaders": {
					"connection": true,
					"accept-encoding": true,
					"accept": true,
					"user-agent": true
				},
				"disableBodyPruning": true
			},
			"request": {
				"method": "GET",
				"header": [
					{
						"key": "x-api-key",
						"value": "{{x-api-key}}"
					}
				],
				"body": {
					"mode": "raw",
					"raw": "",
					"options": {
						"raw": {
							"language": "json"
						}
					}
				},
				"url": {
					"raw": "https://api-sandbox.collaborator.komerce.id/tariff/api/v1/destination/search?keyword=bandung",
					"protocol": "https",
					"host": [
						"api-sandbox",
						"collaborator",
						"komerce",
						"id"
					],
					"path": [
						"tariff",
						"api",
						"v1",
						"destination",
						"search"
					],
					"query": [
						{
							"key": "keyword",
							"value": "bandung"
						}
					]
				},
				"description": "Generated from cURL: curl --location 'https://api.collaborator.komerce.id/tariff/api/v1/destination/search?keyword=kiaracondong' \\\n--header 'Accept: application/json' \\\n--header 'x-api-key: your_api_key'"
			},
			"response": []
		},
		{
			"name": "Calculate",
			"request": {
				"method": "GET",
				"header": [
					{
						"key": "x-api-key",
						"value": "{{x-api-key}}"
					}
				],
				"url": {
					"raw": "https://api-sandbox.collaborator.komerce.id/tariff/api/v1/calculate?shipper_destination_id=68423&receiver_destination_id=68424&weight=1&item_value=10000&cod=yes&origin_pin_point=-7.274631, 109.207174&destination_pin_point=-7.274631, 109.207174",
					"protocol": "https",
					"host": [
						"api-sandbox",
						"collaborator",
						"komerce",
						"id"
					],
					"path": [
						"tariff",
						"api",
						"v1",
						"calculate"
					],
					"query": [
						{
							"key": "shipper_destination_id",
							"value": "68423",
							"description": "Exampe Destination ID"
						},
						{
							"key": "receiver_destination_id",
							"value": "68424",
							"description": "Example Destination ID"
						},
						{
							"key": "weight",
							"value": "1",
							"description": "Example Weight Package"
						},
						{
							"key": "item_value",
							"value": "10000",
							"description": "Example Item Value (Price)"
						},
						{
							"key": "cod",
							"value": "yes",
							"description": "Checking Available for COD"
						},
						{
							"key": "origin_pin_point",
							"value": "-7.274631, 109.207174"
						},
						{
							"key": "destination_pin_point",
							"value": "-7.274631, 109.207174"
						}
					]
				},
				"description": "Generated from cURL: curl --location 'https://api.collaborator.komerce.my.id/tariff/api/v1/calculate?shipper_destination_id=17588&receiver_destination_id=17589&weight=1&item_value=50000&cod=yes' \\\n--header 'Accept: application/json' \\\n--header 'x-api-key: your_api_key'"
			},
			"response": []
		},
		{
			"name": "Store Order",
			"protocolProfileBehavior": {
				"disabledSystemHeaders": {
					"content-type": true
				}
			},
			"request": {
				"method": "POST",
				"header": [
					{
						"key": "x-api-key",
						"value": "{{x-api-key}}"
					}
				],
				"body": {
					"mode": "raw",
					"raw": "{\n    \"order_date\": \"2025-08-14\",\n    \"brand_name\": \"oddo\",\n    \"shipper_name\": \"siapo\",\n    \"shipper_phone\": \"080123456789\",\n    \"shipper_destination_id\": 68423,\n    \"shipper_address\": \"Alamat pengirim\",\n    \"shipper_email\": \"siapo@gmail.com\",\n    \"origin_pin_point\": \"-7.274631, 109.207174\",\n    \"receiver_name\": \"Buyer Bandung\",\n    \"receiver_phone\": \"08123458282\",\n    \"receiver_destination_id\": 68424,\n    \"receiver_address\": \"Alamat penerima\",\n    \"destination_pin_point\": \"-7.274631, 109.207174\",\n    \"shipping\": \"NINJA\",\n    \"shipping_type\": \"Standard\",\n    \"payment_method\": \"BANK TRANSFER\",\n    \"shipping_cost\": 14800,\n    \"shipping_cashback\": 6660,\n    \"service_fee\": 0,\n    \"additional_cost\": 0,\n    \"grand_total\": 24800,\n    \"cod_value\": 0,\n    \"insurance_value\": 0,\n    \"order_details\": [\n        {\n            \"product_name\": \"Xiaomi Redmi Note 99\",\n            \"product_variant_name\": \"Blue 8/256\",\n            \"product_price\": 10000,\n            \"product_weight\": 1000,\n            \"product_width\": 10,\n            \"product_height\": 8,\n            \"product_length\": 50,\n            \"qty\": 1,\n            \"subtotal\": 10000\n        }\n    ]\n}",
					"options": {
						"raw": {
							"language": "json"
						}
					}
				},
				"url": {
					"raw": "https://api-sandbox.collaborator.komerce.id/order/api/v1/orders/store",
					"protocol": "https",
					"host": [
						"api-sandbox",
						"collaborator",
						"komerce",
						"id"
					],
					"path": [
						"order",
						"api",
						"v1",
						"orders",
						"store"
					]
				},
				"description": "Generated from cURL: curl --location 'https://api.collaborator.komerce.my.id/order/api/v1/orders/store' \\\n--header 'Content-Type: application/json' \\\n--header 'Accept: application/json' \\\n--header 'x-api-key: xyz' \\\n--data-raw '{\n    \"order_date\": \"2024-05-29 23:59:59\",\n    \"brand_name\": \"Komship\",\n    \"shipper_name\": \"Toko Official Komship\",\n    \"shipper_phone\": \"6281234567689\",\n    \"shipper_destination_id\": 17588,\n    \"shipper_address\": \"order address detail\",\n    \"shipper_email\":\"test@gmail.com\",\n    \"receiver_name\": \"Buyer A\",\n    \"receiver_phone\": \"6281209876543\",\n    \"receiver_destination_id\": 17589,\n    \"receiver_address\": \"order destination address detail\",\n    \"shipping\": \"JNT\",\n    \"shipping_type\": \"EZ\",\n    \"payment_method\": \"COD\",\n    \"shipping_cost\":22000,\n    \"shipping_cashback\":10000,\n    \"service_fee\":2500,\n    \"additional_cost\":1000,\n    \"grand_total\":317000,\n    \"cod_value\":317000,\n    \"insurance_value\": 1000,\n    \"order_details\": [\n        {\n            \"product_name\": \"Komship package\",\n            \"product_variant_name\": \"Komship variant product\",\n            \"product_price\": 500000,\n            \"product_width\": 5,\n            \"product_height\": 2,\n            \"product_weight\": 5100,\n            \"product_length\": 20,\n            \"qty\": 1,\n            \"subtotal\": 500000\n        }\n    ]\n}'"
			},
			"response": []
		},
		{
			"name": "Cancel Order",
			"request": {
				"method": "PUT",
				"header": [
					{
						"key": "x-api-key",
						"value": "{{x-api-key}}"
					}
				],
				"body": {
					"mode": "raw",
					"raw": "{\n  \"order_no\": \"KOM42272202508140857\"\n}",
					"options": {
						"raw": {
							"language": "json"
						}
					}
				},
				"url": {
					"raw": "https://api-sandbox.collaborator.komerce.id/order/api/v1/orders/cancel",
					"protocol": "https",
					"host": [
						"api-sandbox",
						"collaborator",
						"komerce",
						"id"
					],
					"path": [
						"order",
						"api",
						"v1",
						"orders",
						"cancel"
					]
				},
				"description": "Generated from cURL: curl --location --request PUT 'https://api.collaborator.komerce.my.id/order/api/v1/orders/cancel' \\\n--header 'Content-Type: application/json' \\\n--header 'Accept: application/json' \\\n--header 'x-api-key: your_api_key' \\\n--data '{\n  \"order_no\": \"KOM20230607178649\"\n}'"
			},
			"response": []
		},
		{
			"name": "Detail Order",
			"request": {
				"method": "GET",
				"header": [
					{
						"key": "x-api-key",
						"value": "{{x-api-key}}"
					}
				],
				"url": {
					"raw": "https://api-sandbox.collaborator.komerce.id/order/api/v1/orders/detail?order_no=KOM42272202508140857",
					"protocol": "https",
					"host": [
						"api-sandbox",
						"collaborator",
						"komerce",
						"id"
					],
					"path": [
						"order",
						"api",
						"v1",
						"orders",
						"detail"
					],
					"query": [
						{
							"key": "order_no",
							"value": "KOM42272202508140857"
						}
					]
				},
				"description": "Generated from cURL: curl --location '/order/api/v1/orders/detail?order_no=KOM20230612145122' \\\n--header 'Accept: application/json' \\\n--header 'x-api-key: your_api_key'"
			},
			"response": []
		},
		{
			"name": "History AWB",
			"request": {
				"method": "GET",
				"header": [
					{
						"key": "x-api-key",
						"value": "{{x-api-key}}"
					}
				],
				"url": {
					"raw": "https://api-sandbox.collaborator.komerce.id/order/api/v1/orders/history-airway-bill?shipping=NINJA&airway_bill=KOMERKOM43173202505221320",
					"protocol": "https",
					"host": [
						"api-sandbox",
						"collaborator",
						"komerce",
						"id"
					],
					"path": [
						"order",
						"api",
						"v1",
						"orders",
						"history-airway-bill"
					],
					"query": [
						{
							"key": "shipping",
							"value": "NINJA"
						},
						{
							"key": "airway_bill",
							"value": "KOMERKOM43173202505221320"
						}
					]
				},
				"description": "Generated from cURL: curl --location 'https://api.collaborator.komerce.my.id/order/api/v1/orders/history-airway-bill?shipping=SAP&airway_bill=DMP00125410785' \\\n--header 'x-api-key: xyz'"
			},
			"response": []
		},
		{
			"name": "Pickup",
			"request": {
				"method": "POST",
				"header": [
					{
						"key": "x-api-key",
						"value": "{{x-api-key}}"
					}
				],
				"body": {
					"mode": "raw",
					"raw": "{\n    \"pickup_date\": \"2025-08-14\",\n    \"pickup_time\": \"16:30\",\n    \"pickup_vehicle\": \"Motor\",\n    \"orders\": [\n        {\n            \"order_no\": \"KOM02783202508140906\"\n        }\n    ]\n}",
					"options": {
						"raw": {
							"language": "json"
						}
					}
				},
				"url": {
					"raw": "https://api-sandbox.collaborator.komerce.id/order/api/v1/pickup/request",
					"protocol": "https",
					"host": [
						"api-sandbox",
						"collaborator",
						"komerce",
						"id"
					],
					"path": [
						"order",
						"api",
						"v1",
						"pickup",
						"request"
					]
				},
				"description": "Generated from cURL: curl --location 'https://api.collaborator.komerce.my.id/order/api/v1/pickup/request' \\\n--header 'Content-Type: application/json' \\\n--header 'Accept: application/json' \\\n--header 'x-api-key: xyz' \\\n--data '{\n  \"pickup_date\": \"2023-06-12\",\n  \"pickup_time\": \"20:00:00\",\n  \"pickup_vehicle\": \"Motor\",\n  \"orders\": [\n    {\n      \"order_no\": \"KOM20230612190023\"\n    }\n  ]\n}'"
			},
			"response": []
		},
		{
			"name": "Label",
			"request": {
				"method": "POST",
				"header": [
					{
						"key": "x-api-key",
						"value": "{{x-api-key}}",
						"type": "text"
					}
				],
				"url": {
					"raw": "https://api-sandbox.collaborator.komerce.id/order/api/v1/orders/print-label?page=page_5&order_no=KOM46444202505221451",
					"protocol": "https",
					"host": [
						"api-sandbox",
						"collaborator",
						"komerce",
						"id"
					],
					"path": [
						"order",
						"api",
						"v1",
						"orders",
						"print-label"
					],
					"query": [
						{
							"key": "page",
							"value": "page_5"
						},
						{
							"key": "order_no",
							"value": "KOM46444202505221451"
						}
					]
				},
				"description": "Generated from cURL: curl --location --request POST 'https://api.collaborator.komerce.my.id/order/api/v1/orders/print-label?order_no=KOM20230906161162%2C%20KOM20230612190023%2C%20KOM20230906195899&page=page_2'"
			},
			"response": []
		},
		{
			"name": "Webhook",
			"request": {
				"method": "PUT",
				"header": [
					{
						"key": "Accept",
						"value": "application/json"
					},
					{
						"key": "Content-Type",
						"value": "application/json"
					}
				],
				"body": {
					"mode": "raw",
					"raw": "{\n  \"order_no\": \"KOM20230427102158\",\n  \"cnote\": \"8906976878670798\",\n  \"status\": \"Diterima\"\n}",
					"options": {
						"raw": {
							"language": "json"
						}
					}
				},
				"url": {
					"raw": "your_endpoint_url",
					"host": [
						"your_endpoint_url"
					]
				},
				"description": "Generated from cURL: curl -X 'PUT' \\\n  'your_endpoint_url' \\\n  -H 'accept: application/json' \\\n  -H 'Content-Type: application/json' \\\n  -d '{\n  \"order_no\": \"KOM20230427102158\",\n  \"cnote\": \"8906976878670798\",\n  \"status\": \"Diterima\"\n}'"
			},
			"response": []
		}
	]
}