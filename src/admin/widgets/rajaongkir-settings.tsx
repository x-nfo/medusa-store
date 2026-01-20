import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Button, Select, clx } from "@medusajs/ui"
import { useEffect, useState } from "react"

type ProvinceOption = {
    id: string
    name: string
}

type CityOption = {
    id: string
    name: string
}

type DistrictOption = {
    id: string
    name: string
}

type SubdistrictOption = {
    id: string
    name: string
    zip_code?: string
}

type LocationSettings = {
    rajaongkir_province_id: string | null
    rajaongkir_province_name: string | null
    rajaongkir_city_id: string | null
    rajaongkir_city_name: string | null
    rajaongkir_district_id: string | null
    rajaongkir_district_name: string | null
    rajaongkir_subdistrict_id: string | null
    rajaongkir_subdistrict_name: string | null
}

type WidgetProps = {
    data: {
        id: string
        name?: string
        address?: {
            phone?: string
            address_1?: string
        }
        metadata?: Record<string, unknown>
    }
}

/**
 * RajaOngkir Location Mapping Widget (V2 Hierarchical Approach)
 * 
 * Step-by-step: Province → City → District → Subdistrict
 */
const RajaOngkirCityWidget = ({ data }: WidgetProps) => {
    const locationId = data.id

    // State
    const [provinces, setProvinces] = useState<ProvinceOption[]>([])
    const [cities, setCities] = useState<CityOption[]>([])
    const [districts, setDistricts] = useState<DistrictOption[]>([])
    const [subdistricts, setSubdistricts] = useState<SubdistrictOption[]>([])

    const [selectedProvince, setSelectedProvince] = useState<string>("")
    const [selectedCity, setSelectedCity] = useState<CityOption | null>(null)
    const [selectedDistrict, setSelectedDistrict] = useState<DistrictOption | null>(null)
    const [selectedSubdistrict, setSelectedSubdistrict] = useState<SubdistrictOption | null>(null)

    const [hasRajaOngkir, setHasRajaOngkir] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

    // Fetch provinces on mount
    useEffect(() => {
        const loadSettings = async () => {
            setIsLoading(true)
            try {
                // Check if RajaOngkir is enabled
                const locResponse = await fetch(`/admin/stock-locations/${locationId}?fields=*fulfillment_providers`)
                if (locResponse.ok) {
                    const locData = await locResponse.json()
                    const providers = locData.stock_location?.fulfillment_providers || []
                    const isRajaOngkirEnabled = providers.some((p: any) => p.id === "rajaongkir" || p.id.includes("rajaongkir"))

                    if (!isRajaOngkirEnabled) {
                        setHasRajaOngkir(false)
                        setIsLoading(false)
                        return
                    }
                    setHasRajaOngkir(true)
                }

                // Fetch provinces
                const provResponse = await fetch('/admin/rajaongkir/provinces')
                if (provResponse.ok) {
                    const data = await provResponse.json()
                    setProvinces(data.provinces || [])
                }

                // Load existing settings
                const response = await fetch(`/admin/rajaongkir/locations/${locationId}`)
                if (response.ok) {
                    const data: LocationSettings & { success: boolean } = await response.json()

                    if (data.success) {
                        // Restore Province
                        if (data.rajaongkir_province_id) {
                            setSelectedProvince(data.rajaongkir_province_id)

                            // Load cities for this province immediately
                            const cityResponse = await fetch(`/admin/rajaongkir/cities?province=${data.rajaongkir_province_id}`)
                            if (cityResponse.ok) {
                                const cityData = await cityResponse.json()
                                setCities(cityData.cities || [])
                            }
                        }

                        if (data.rajaongkir_city_id && data.rajaongkir_city_name) {
                            setSelectedCity({
                                id: data.rajaongkir_city_id,
                                name: data.rajaongkir_city_name,
                            })

                            // Load districts if city exists
                            if (data.rajaongkir_district_id) {
                                const distResponse = await fetch(`/admin/rajaongkir/districts?city=${data.rajaongkir_city_id}`)
                                if (distResponse.ok) {
                                    const distData = await distResponse.json()
                                    setDistricts(distData.districts || [])
                                }

                                setSelectedDistrict({
                                    id: data.rajaongkir_district_id,
                                    name: data.rajaongkir_district_name || "",
                                })

                                // Load subdistricts if district exists
                                if (data.rajaongkir_subdistrict_id) {
                                    const subdistResponse = await fetch(`/admin/rajaongkir/subdistricts?district=${data.rajaongkir_district_id}`)
                                    if (subdistResponse.ok) {
                                        const subdistData = await subdistResponse.json()
                                        setSubdistricts(subdistData.subdistricts || [])
                                    }

                                    setSelectedSubdistrict({
                                        id: data.rajaongkir_subdistrict_id,
                                        name: data.rajaongkir_subdistrict_name || "",
                                    })
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to load RajaOngkir settings:", error)
            } finally {
                setIsLoading(false)
            }
        }

        loadSettings()
    }, [locationId])

    // Fetch cities when province changes
    const handleProvinceChange = async (provinceId: string) => {
        setSelectedProvince(provinceId)
        setSelectedCity(null)
        setSelectedDistrict(null)
        setSelectedSubdistrict(null)
        setCities([])
        setDistricts([])
        setSubdistricts([])
        setSaveMessage(null)

        if (!provinceId) return

        try {
            const response = await fetch(`/admin/rajaongkir/cities?province=${provinceId}`)
            if (response.ok) {
                const data = await response.json()
                setCities(data.cities || [])
            }
        } catch (error) {
            console.error("Failed to fetch cities:", error)
        }
    }

    // Fetch districts when city changes
    const handleCityChange = async (cityId: string) => {
        const city = cities.find(c => c.id === cityId)
        if (!city) return

        setSelectedCity(city)
        setSelectedDistrict(null)
        setSelectedSubdistrict(null)
        setDistricts([])
        setSubdistricts([])
        setSaveMessage(null)

        try {
            const response = await fetch(`/admin/rajaongkir/districts?city=${cityId}`)
            if (response.ok) {
                const data = await response.json()
                setDistricts(data.districts || [])
            }
        } catch (error) {
            console.error("Failed to fetch districts:", error)
        }
    }

    // Fetch subdistricts when district changes
    const handleDistrictChange = async (districtId: string) => {
        const district = districts.find(d => d.id === districtId)
        if (!district) return

        setSelectedDistrict(district)
        setSelectedSubdistrict(null)
        setSubdistricts([])
        setSaveMessage(null)

        try {
            const response = await fetch(`/admin/rajaongkir/subdistricts?district=${districtId}`)
            if (response.ok) {
                const data = await response.json()
                setSubdistricts(data.subdistricts || [])
            }
        } catch (error) {
            console.error("Failed to fetch subdistricts:", error)
        }
    }

    const handleSave = async () => {
        if (!selectedProvince) {
            setSaveMessage({ type: "error", text: "Pilih provinsi terlebih dahulu" })
            return
        }
        if (!selectedCity) {
            setSaveMessage({ type: "error", text: "Pilih kota terlebih dahulu" })
            return
        }
        if (!selectedDistrict) {
            setSaveMessage({ type: "error", text: "Pilih kecamatan terlebih dahulu" })
            return
        }
        if (!selectedSubdistrict) {
            setSaveMessage({ type: "error", text: "Pilih kelurahan terlebih dahulu" })
            return
        }

        setIsSaving(true)
        setSaveMessage(null)

        try {
            const response = await fetch(`/admin/rajaongkir/locations/${locationId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    rajaongkir_province_id: selectedProvince,
                    rajaongkir_province_name: provinces.find(p => p.id === selectedProvince)?.name,
                    rajaongkir_city_id: selectedCity.id,
                    rajaongkir_city_name: selectedCity.name,
                    rajaongkir_district_id: selectedDistrict.id,
                    rajaongkir_district_name: selectedDistrict.name,
                    rajaongkir_subdistrict_id: selectedSubdistrict.id,
                    rajaongkir_subdistrict_name: selectedSubdistrict.name,
                }),
            })

            if (response.ok) {
                setSaveMessage({ type: "success", text: "Tersimpan" })
            } else {
                setSaveMessage({ type: "error", text: "Gagal menyimpan" })
            }
        } catch (error) {
            console.error("Failed to save settings:", error)
            setSaveMessage({ type: "error", text: "Gagal menyimpan" })
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <Container className="p-4">
                <Text className="text-ui-fg-muted text-sm">Loading settings...</Text>
            </Container>
        )
    }

    if (!hasRajaOngkir) {
        return null
    }

    return (
        <Container className="divide-y p-0">
            <div className="px-6 py-4">
                <Heading level="h2" className="mb-1">
                    RajaOngkir Location
                </Heading>
                <Text className="text-ui-fg-subtle text-sm">
                    Map Location to RajaOngkir (Province → City → District → Subdistrict)
                </Text>
            </div>

            <div className="px-6 py-4 space-y-4">
                {/* Province Selector */}
                <div>
                    <label className="block text-sm font-medium text-ui-fg-base mb-1">
                        Provinsi (Province)
                    </label>
                    <Select
                        value={selectedProvince}
                        onValueChange={handleProvinceChange}
                    >
                        <Select.Trigger>
                            <Select.Value placeholder="Pilih provinsi..." />
                        </Select.Trigger>
                        <Select.Content>
                            {provinces.map(p => (
                                <Select.Item key={p.id} value={p.id}>
                                    {p.name}
                                </Select.Item>
                            ))}
                        </Select.Content>
                    </Select>
                </div>

                {/* City Selector */}
                {selectedProvince && (
                    <div>
                        <label className="block text-sm font-medium text-ui-fg-base mb-1">
                            Kota (City)
                        </label>
                        <Select
                            value={selectedCity?.id}
                            onValueChange={handleCityChange}
                        >
                            <Select.Trigger>
                                <Select.Value placeholder="Pilih kota..." />
                            </Select.Trigger>
                            <Select.Content>
                                {cities.map(c => (
                                    <Select.Item key={c.id} value={c.id}>
                                        {c.name}
                                    </Select.Item>
                                ))}
                            </Select.Content>
                        </Select>
                        {selectedCity && (
                            <div className="mt-1 text-xs text-ui-fg-subtle">
                                ✓ ID: <strong>{selectedCity.id}</strong>
                            </div>
                        )}
                    </div>
                )}

                {/* District Selector */}
                {selectedCity && (
                    <div>
                        <label className="block text-sm font-medium text-ui-fg-base mb-1">
                            Kecamatan (District)
                        </label>
                        <Select
                            value={selectedDistrict?.id}
                            onValueChange={handleDistrictChange}
                        >
                            <Select.Trigger>
                                <Select.Value placeholder="Pilih kecamatan..." />
                            </Select.Trigger>
                            <Select.Content>
                                {districts.map(d => (
                                    <Select.Item key={d.id} value={d.id}>
                                        {d.name}
                                    </Select.Item>
                                ))}
                            </Select.Content>
                        </Select>
                        {selectedDistrict && (
                            <div className="mt-1 text-xs text-ui-fg-subtle">
                                ✓ ID: <strong>{selectedDistrict.id}</strong>
                            </div>
                        )}
                    </div>
                )}

                {/* Subdistrict Selector */}
                {selectedDistrict && (
                    <div>
                        <label className="block text-sm font-medium text-ui-fg-base mb-1">
                            Kelurahan (Subdistrict)
                        </label>
                        <Select
                            value={selectedSubdistrict?.id}
                            onValueChange={(value) => {
                                const subdist = subdistricts.find(s => s.id === value)
                                if (subdist) setSelectedSubdistrict(subdist)
                            }}
                        >
                            <Select.Trigger>
                                <Select.Value placeholder="Pilih kelurahan..." />
                            </Select.Trigger>
                            <Select.Content>
                                {subdistricts.map(s => (
                                    <Select.Item key={s.id} value={s.id}>
                                        {s.name} {s.zip_code && `(${s.zip_code})`}
                                    </Select.Item>
                                ))}
                            </Select.Content>
                        </Select>
                        {selectedSubdistrict && (
                            <div className="mt-1 text-xs text-ui-fg-subtle">
                                ✓ ID: <strong>{selectedSubdistrict.id}</strong>
                                {selectedSubdistrict.zip_code && ` • Kode Pos: ${selectedSubdistrict.zip_code}`}
                            </div>
                        )}
                        {subdistricts.length === 0 && (
                            <div className="mt-1 text-xs text-ui-fg-muted">
                                Memuat kelurahan...
                            </div>
                        )}
                    </div>
                )}

                {/* Save Button */}
                <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={isSaving || !selectedCity || !selectedDistrict || !selectedSubdistrict}
                    className="w-full"
                >
                    {isSaving ? "Menyimpan..." : "Simpan Lokasi"}
                </Button>

                {/* Status Message */}
                {saveMessage && (
                    <div
                        className={clx(
                            "p-2 rounded-lg text-xs",
                            saveMessage.type === "success"
                                ? "bg-ui-tag-green-bg text-ui-tag-green-text"
                                : "bg-ui-tag-red-bg text-ui-tag-red-text"
                        )}
                    >
                        {saveMessage.text}
                    </div>
                )}

                <div className="text-xs text-ui-fg-muted mt-2">
                    Untuk akurasi v2, wajib memilih lengkap: Provinsi → Kota → Kecamatan → Kelurahan.
                </div>
            </div>
        </Container>
    )
}

export const config = defineWidgetConfig({
    zone: "location.details.side.after",
})

export default RajaOngkirCityWidget
