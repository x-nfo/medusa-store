import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ComponentType } from "react"

const queryClient = new QueryClient()

export const withQueryClient = (Component: ComponentType) => {
    return (props: any) => (
        <QueryClientProvider client={queryClient}>
            <Component {...props} />
        </QueryClientProvider>
    )
}
