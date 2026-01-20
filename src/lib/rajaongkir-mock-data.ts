export const MOCK_PROVINCES = [
    { "province_id": "6", "province": "DKI Jakarta" },
    { "province_id": "9", "province": "Jawa Barat" },
    { "province_id": "10", "province": "Jawa Tengah" },
    { "province_id": "11", "province": "Jawa Timur" },
    { "province_id": "3", "province": "Banten" }
];

export const MOCK_CITIES = [
    // DKI Jakarta
    { "city_id": "151", "province_id": "6", "type": "Kota", "city_name": "Jakarta Barat", "postal_code": "11110" },
    { "city_id": "152", "province_id": "6", "type": "Kota", "city_name": "Jakarta Pusat", "postal_code": "10000" },
    { "city_id": "153", "province_id": "6", "type": "Kota", "city_name": "Jakarta Selatan", "postal_code": "12000" },
    { "city_id": "154", "province_id": "6", "type": "Kota", "city_name": "Jakarta Timur", "postal_code": "13000" },
    { "city_id": "155", "province_id": "6", "type": "Kota", "city_name": "Jakarta Utara", "postal_code": "14000" },
    // Jawa Barat
    { "city_id": "22", "province_id": "9", "type": "Kota", "city_name": "Bandung", "postal_code": "40111" },
    { "city_id": "23", "province_id": "9", "type": "Kabupaten", "city_name": "Bandung", "postal_code": "40311" },
    { "city_id": "54", "province_id": "9", "type": "Kota", "city_name": "Bekasi", "postal_code": "17100" },
    { "city_id": "55", "province_id": "9", "type": "Kabupaten", "city_name": "Bekasi", "postal_code": "17510" },
    { "city_id": "78", "province_id": "9", "type": "Kota", "city_name": "Bogor", "postal_code": "16000" },
    { "city_id": "79", "province_id": "9", "type": "Kabupaten", "city_name": "Bogor", "postal_code": "16900" },
    { "city_id": "115", "province_id": "9", "type": "Kota", "city_name": "Depok", "postal_code": "16400" },
    // Banten
    { "city_id": "455", "province_id": "3", "type": "Kota", "city_name": "Tangerang", "postal_code": "15000" },
    { "city_id": "456", "province_id": "3", "type": "Kota", "city_name": "Tangerang Selatan", "postal_code": "15300" }
];

// Mock Districts for key cities
export const MOCK_DISTRICTS = [
    // Kota Bandung (22)
    { "district_id": "785", "city_id": "22", "district_name": "Andir" },
    { "district_id": "790", "city_id": "22", "district_name": "Cicendo" },
    { "district_id": "794", "city_id": "22", "district_name": "Coblong" },
    { "district_id": "805", "city_id": "22", "district_name": "Sukajadi" },
    { "district_id": "806", "city_id": "22", "district_name": "Sukasari" },
    // Jakarta Selatan (153)
    { "district_id": "2173", "city_id": "153", "district_name": "Cilandak" },
    { "district_id": "2178", "city_id": "153", "district_name": "Kebayoran Baru" },
    { "district_id": "2179", "city_id": "153", "district_name": "Kebayoran Lama" }
];

// Mock Subdistricts for key districts
export const MOCK_SUBDISTRICTS = [
    // Cicendo (790) - Bandung
    { "subdistrict_id": "8612", "district_id": "790", "subdistrict_name": "Arjuna", "zip_code": "40172" },
    { "subdistrict_id": "8613", "district_id": "790", "subdistrict_name": "Husein Sastranegara", "zip_code": "40174" },
    { "subdistrict_id": "8614", "district_id": "790", "subdistrict_name": "Pajajaran", "zip_code": "40173" },
    { "subdistrict_id": "8615", "district_id": "790", "subdistrict_name": "Pamoyanan", "zip_code": "40173" },
    { "subdistrict_id": "8616", "district_id": "790", "subdistrict_name": "Pasirkaliki", "zip_code": "40171" },
    { "subdistrict_id": "8617", "district_id": "790", "subdistrict_name": "Sukaraja", "zip_code": "40175" },

    // Kebayoran Baru (2178) - Jaksel
    { "subdistrict_id": "26580", "district_id": "2178", "subdistrict_name": "Cipete Utara", "zip_code": "12150" },
    { "subdistrict_id": "26581", "district_id": "2178", "subdistrict_name": "Gandaria Utara", "zip_code": "12140" },
    { "subdistrict_id": "26582", "district_id": "2178", "subdistrict_name": "Gunung", "zip_code": "12120" },
    { "subdistrict_id": "26583", "district_id": "2178", "subdistrict_name": "Kramat Pela", "zip_code": "12130" },
    { "subdistrict_id": "26586", "district_id": "2178", "subdistrict_name": "Senayan", "zip_code": "12190" }
];
