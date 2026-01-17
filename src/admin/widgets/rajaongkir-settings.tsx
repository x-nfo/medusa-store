import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Input, Button, clx } from "@medusajs/ui"
import { useEffect, useState, useCallback } from "react"

type CityOption = {
    id: string
    name: string
    province: string
    type: string
}

type LocationSettings = {
    rajaongkir_city_id: string | null
    rajaongkir_city_name: string | null
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
 * RajaOngkir City Mapping Widget
 * 
 * Sidebar widget to map the Stock Location to a RajaOngkir City ID.
 */
const RajaOngkirCityWidget = ({ data }: WidgetProps) => {
    const locationId = data.id

    // State
    const [search, setSearch] = useState("")
    const [cities, setCities] = useState<CityOption[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)

    const [selectedCity, setSelectedCity] = useState<CityOption | null>(null)
    const [hasRajaOngkir, setHasRajaOngkir] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    const [isSaving, setIsSaving] = useState(false)
    const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

    // Load existing settings and check providers
    useEffect(() => {
        const loadSettings = async () => {
            setIsLoading(true)
            try {
                // Fetch location details with fulfillment_providers relation
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

                // If RajaOngkir is enabled, fetch settings
                const response = await fetch(`/admin/rajaongkir/locations/${locationId}`)
                if (response.ok) {
                    const data: LocationSettings & { success: boolean } = await response.json()
                    if (data.success && data.rajaongkir_city_id && data.rajaongkir_city_name) {
                        setSelectedCity({
                            id: data.rajaongkir_city_id,
                            name: data.rajaongkir_city_name,
                            province: "",
                            type: "city",
                        })
                        setSearch(data.rajaongkir_city_name)
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

    // Search cities with debounce
    const searchCities = useCallback(async (term: string) => {
        if (!term || term.length < 2) {
            setCities([])
            return
        }

        setIsSearching(true)
        try {
            const response = await fetch(`/admin/rajaongkir/cities?search=${encodeURIComponent(term)}&limit=15`)
            if (response.ok) {
                const data = await response.json()
                setCities(data.cities || [])
            }
        } catch (error) {
            console.error("Failed to search cities:", error)
            setCities([])
        } finally {
            setIsSearching(false)
        }
    }, [])

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (search && !selectedCity) {
                searchCities(search)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [search, selectedCity, searchCities])

    // Handle city selection
    const handleSelectCity = (city: CityOption) => {
        setSelectedCity(city)
        setSearch(city.name)
        setShowDropdown(false)
        setCities([])
        setSaveMessage(null)
    }

    // Handle search input change
    const handleSearchChange = (value: string) => {
        setSearch(value)
        setSelectedCity(null)
        setShowDropdown(true)
        setSaveMessage(null)
    }

    // Handle save
    const handleSave = async () => {
        if (!selectedCity) {
            setSaveMessage({ type: "error", text: "Pilih kota terlebih dahulu" })
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
                    rajaongkir_city_id: selectedCity.id,
                    rajaongkir_city_name: selectedCity.name,
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
                    RajaOngkir City
                </Heading>
                <Text className="text-ui-fg-subtle text-sm">
                    Map RajaOngkir City ID
                </Text>
            </div>

            <div className="px-6 py-4 space-y-4">
                {/* City Search */}
                <div className="relative">
                    <label className="block text-sm font-medium text-ui-fg-base mb-1">
                        Cari Kota
                    </label>
                    <Input
                        type="text"
                        placeholder="Ketik nama kota..."
                        value={search}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        onFocus={() => setShowDropdown(true)}
                        className="w-full"
                    />

                    {/* Dropdown */}
                    {showDropdown && (cities.length > 0 || isSearching) && (
                        <div className="absolute z-50 w-full mt-1 bg-ui-bg-base border border-ui-border-base rounded-lg shadow-lg max-h-60 overflow-auto">
                            {isSearching ? (
                                <div className="px-4 py-3 text-sm text-ui-fg-subtle">
                                    Mencari...
                                </div>
                            ) : (
                                cities.map((city) => (
                                    <button
                                        key={city.id}
                                        type="button"
                                        className={clx(
                                            "w-full px-4 py-2 text-left text-sm hover:bg-ui-bg-base-hover",
                                            "focus:outline-none focus:bg-ui-bg-base-hover"
                                        )}
                                        onClick={() => handleSelectCity(city)}
                                    >
                                        <div className="font-medium">{city.name}</div>
                                        <div className="text-xs text-ui-fg-subtle">
                                            ID: {city.id}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    )}

                    {selectedCity && (
                        <div className="mt-2 text-xs text-ui-fg-subtle">
                            ✓ Selected ID: <strong>{selectedCity.id}</strong>
                        </div>
                    )}
                </div>

                {/* Save Button */}
                <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={isSaving || !selectedCity}
                    className="w-full"
                >
                    {isSaving ? "Menyimpan..." : "Simpan Kota"}
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
                    Nama pengirim dan alamat akan diambil dari pengaturan lokasi standar.
                </div>
            </div>
        </Container>
    )
}

export const config = defineWidgetConfig({
    zone: "location.details.side.after",
})

export default RajaOngkirCityWidget
