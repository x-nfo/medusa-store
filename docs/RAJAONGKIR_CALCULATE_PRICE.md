# District Calculate Price

<https://rajaongkir.komerce.id/api/v1/calculate/district/domestic-cost>

The Calculate Domestic Cost by District Endpoint is the final and most critical step in the hierarchical location selection process of the RajaOngkir API. This endpoint calculates the shipping cost between two districts within Indonesia based on selected courier services, package weight, and other parameters.

By leveraging the origin and destination district IDs obtained from previous steps, this endpoint returns real-time shipping rates from multiple couriers. It enables users to compare prices, estimate delivery fees, and make informed choices during checkout or logistics planning.

This endpoint is essential for e-commerce platforms, marketplace systems, delivery apps, and logistics tools that require automated, up-to-date cost calculations tailored to user-selected locations and shipping preferences.

## Endpoint Details

Method:
POST

Base URL:
<https://rajaongkir.komerce.id/api/v1/calculate/district/domestic-cost>

Content-Type:
application/x-www-form-urlencoded

Description:
Calculates domestic shipping costs between two Indonesian districts using the selected couriers and package weight. The result includes shipping options, estimated delivery times, and total fees from multiple courier services.

This endpoint is the final step in the Step-by-Step Method integration flow, utilizing all previously gathered location data to provide accurate, courier-specific shipping cost estimations.

### Request Body

const url = '<https://rajaongkir.komerce.id/api/v1/calculate/district/domestic-cost>';
const options = {
  method: 'POST',
  headers: {
    accept: 'application/json',
    key: 'YOUR_API_KEY',
    'content-type': 'application/json'
  }

fetch(url, options)
  .then(res => res.json())
  .then(json => console.log(json))
  .catch(err => console.error(err));
fetch(url, options) .then(res => res.json()) .then(json => console.log(json)) .catch(err => console.error(err));

</TabItem>
</Tabs>

## Response

<Tabs>
<TabItem value='200' label='200'>
```bash
{
"meta": {
  "message": "Success Calculate Domestic Shipping cost",
  "code": 200,
  "status": "success"
},
"data": [
  {
    "name": "Lion Parcel",
    "code": "lion",
    "service": "JAGOPACK",
    "description": "Economy Service",
    "cost": 7000,
    "etd": "1-4 day"
  },
  {
    "name": "Lion Parcel",
    "code": "lion",
    "service": "REGPACK",
    "description": "Regular Service",
    "cost": 7500,
    "etd": "1-2 day"
  },
  {
    "name": "J&T Express",
    "code": "jnt",
    "service": "EZ",
    "description": "Reguler",
    "cost": 8000,
    "etd": ""
  },
  {
    "name": "Ninja Xpress",
    "code": "ninja",
    "service": "STANDARD",
    "description": "Standard Service",
    "cost": 8000,
    "etd": ""
  },
  {
    "name": "POS Indonesia (POS)",
    "code": "pos",
    "service": "Pos Reguler",
    "description": "240",
    "cost": 8000,
    "etd": "2 day"
  },
  {
    "name": "Satria Antaran Prima",
    "code": "sap",
    "service": "UDRREG",
    "description": "Reguler",
    "cost": 8000,
    "etd": "1-3 day"
  },
  {
    "name": "SiCepat Express",
    "code": "sicepat",
    "service": "REG",
    "description": "Reguler",
    "cost": 8000,
    "etd": "1-2 day"
  },
  {
    "name": "Royal Express Indonesia (REX)",
    "code": "rex",
    "service": "REG",
    "description": "Regular",
    "cost": 8500,
    "etd": "3-3 day"
  },
  {
    "name": "ID Express",
    "code": "ide",
    "service": "STD",
    "description": "Std",
    "cost": 9000,
    "etd": "0-0 day"
  },
  {
    "name": "Royal Express Indonesia (REX)",
    "code": "rex",
    "service": "EXP",
    "description": "Express",
    "cost": 9500,
    "etd": "2-2 day"
  },
  {
    "name": "Jalur Nugraha Ekakurir (JNE)",
    "code": "jne",
    "service": "CTC",
    "description": "JNE City Courier",
    "cost": 10000,
    "etd": "1 day"
  },
  {
    "name": "Lion Parcel",
    "code": "lion",
    "service": "BOSSPACK",
    "description": "Priority Service",
    "cost": 10000,
    "etd": "1-1 day"
  },
  {
    "name": "Lion Parcel",
    "code": "lion",
    "service": "SAMEDAY",
    "description": "Unknown Service",
    "cost": 10000,
    "etd": "0-1 day"
  },
  {
    "name": "Royal Express Indonesia (REX)",
    "code": "rex",
    "service": "REX-1",
    "description": "Rex-1",
    "cost": 13500,
    "etd": "1-1 day"
  },
  {
    "name": "SiCepat Express",
    "code": "sicepat",
    "service": "BEST",
    "description": "Besok Sampai Tujuan",
    "cost": 14000,
    "etd": "1 day"
  },
  {
    "name": "POS Indonesia (POS)",
    "code": "pos",
    "service": "Pos Nextday",
    "description": "447",
    "cost": 15000,
    "etd": "1 day"
  },
  {
    "name": "Satria Antaran Prima",
    "code": "sap",
    "service": "UDRONS",
    "description": "Nextday",
    "cost": 15000,
    "etd": "1-2 day"
  },
  {
    "name": "POS Indonesia (POS)",
    "code": "pos",
    "service": "PAKETPOS DANGEROUS GOODS",
    "description": "Pdg",
    "cost": 16500,
    "etd": "3 day"
  },
  {
    "name": "POS Indonesia (POS)",
    "code": "pos",
    "service": "PAKETPOS VALUABLE GOODS",
    "description": "Pvg",
    "cost": 16500,
    "etd": "3 day"
  },
  {
    "name": "Jalur Nugraha Ekakurir (JNE)",
    "code": "jne",
    "service": "CTCYES",
    "description": "JNE City Courier",
    "cost": 18000,
    "etd": "1 day"
  },
  {
    "name": "POS Indonesia (POS)",
    "code": "pos",
    "service": "Pos Sameday",
    "description": "2q9",
    "cost": 18000,
    "etd": "0 day"
  },
  {
    "name": "Satria Antaran Prima",
    "code": "sap",
    "service": "DRGREG",
    "description": "Cargo",
    "cost": 22500,
    "etd": "2-4 day"
  },
  {
    "name": "Jalur Nugraha Ekakurir (JNE)",
    "code": "jne",
    "service": "CTCSPS",
    "description": "JNE City Courier",
    "cost": 25000,
    "etd": "1 day"
  },
  {
    "name": "Lion Parcel",
    "code": "lion",
    "service": "BIGPACK",
    "description": "Big Package Service",
    "cost": 30000,
    "etd": "3-4 day"
  },
  {
    "name": "Royal Express Indonesia (REX)",
    "code": "rex",
    "service": "REX-10",
    "description": "Rex-10",
    "cost": 32500,
    "etd": "3-3 day"
  },
  {
    "name": "Satria Antaran Prima",
    "code": "sap",
    "service": "UDRSDS",
    "description": "Sds",
    "cost": 34000,
    "etd": "0-1 day"
  },
  {
    "name": "POS Indonesia (POS)",
    "code": "pos",
    "service": "POS KARGO",
    "description": "Pjb",
    "cost": 35000,
    "etd": "7-14 day"
  },
  {
    "name": "SiCepat Express",
    "code": "sicepat",
    "service": "GOKIL",
    "description": "Cargo Per Kg (Minimal 10kg)",
    "cost": 35000,
    "etd": "2-3 day"
  },
  {
    "name": "Jalur Nugraha Ekakurir (JNE)",
    "code": "jne",
    "service": "JTR",
    "description": "JNE Trucking",
    "cost": 40000,
    "etd": "3 day"
  },
  {
    "name": "Royal Express Indonesia (REX)",
    "code": "rex",
    "service": "REX-0",
    "description": "Rex-0",
    "cost": 75000,
    "etd": "0-0 day"
  },
  {
    "name": "Royal Express Indonesia (REX)",
    "code": "rex",
    "service": "M-100",
    "description": "Motor 100cc",
    "cost": 200000,
    "etd": "2-2 day"
  },
  {
    "name": "Jalur Nugraha Ekakurir (JNE)",
    "code": "jne",
    "service": "JTR<130",
    "description": "JNE Trucking",
    "cost": 300000,
    "etd": "3 day"
  },
  {
    "name": "Royal Express Indonesia (REX)",
    "code": "rex",
    "service": "M-150",
    "description": "Motor 150cc",
    "cost": 300000,
    "etd": "2-2 day"
  },
  {
    "name": "Lion Parcel",
    "code": "lion",
    "service": "OTOPACK150",
    "description": "Otomotive Shipping Service",
    "cost": 315500,
    "etd": "4-6 day"
  },
  {
    "name": "Lion Parcel",
    "code": "lion",
    "service": "OTOPACK250",
    "description": "Otomotive Shipping Service",
    "cost": 438500,
    "etd": "4-6 day"
  },
  {
    "name": "Jalur Nugraha Ekakurir (JNE)",
    "code": "jne",
    "service": "JTR>130",
    "description": "JNE Trucking",
    "cost": 450000,
    "etd": "3 day"
  },
  {
    "name": "Jalur Nugraha Ekakurir (JNE)",
    "code": "jne",
    "service": "JTR>200",
    "description": "JNE Trucking",
    "cost": 550000,
    "etd": "3 day"
  }
]
}
