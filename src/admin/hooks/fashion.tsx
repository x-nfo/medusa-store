import { useMutation, useQueryClient } from "@tanstack/react-query"
// We don't strictly need to import models here unless we want to type the mutation payload or response rigorously.
// For now, I'll keep it simple to ensure it compiles and works based on observed usage.

export const useCreateMaterialMutation = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (payload: { name: string }) => {
            return fetch(`/admin/fashion`, {
                method: "POST",
                body: JSON.stringify(payload),
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            }).then((res) => res.json())
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["fashion"],
            })
        },
    })
}

export const useCreateColorMutation = (materialId: string) => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (payload: { name: string; hex_code: string }) => {
            return fetch(`/admin/fashion/${materialId}/colors`, {
                method: "POST",
                body: JSON.stringify(payload),
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            }).then((res) => res.json())
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["fashion", materialId, "colors"],
            })
            queryClient.invalidateQueries({
                queryKey: ["fashion"],
            })
        },
    })
}
