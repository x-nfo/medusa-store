import { z } from "zod"
import { Button, Drawer } from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Form } from "./Form/Form"
import { InputField } from "./Form/InputField"

export const materialFormSchema = z.object({
    name: z.string().min(1),
})

type EditMaterialDrawerProps = {
    id: string
    initialValues: z.infer<typeof materialFormSchema>
    children: React.ReactNode
}

export const EditMaterialDrawer = ({
    id,
    initialValues,
    children,
}: EditMaterialDrawerProps) => {
    const [open, setOpen] = useState(false)
    const queryClient = useQueryClient()

    const updateMaterialMutation = useMutation({
        mutationFn: async (values: z.infer<typeof materialFormSchema>) => {
            return fetch(`/admin/fashion/${id}`, {
                method: "POST", // Assumed POST for update based on typical patterns, or PUT/POST as per `route.ts`. Can be adjusted.
                body: JSON.stringify(values),
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            }).then((res) => res.json())
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fashion"] })
            setOpen(false)
        },
    })

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <Drawer.Trigger asChild>{children}</Drawer.Trigger>
            <Drawer.Content>
                <Drawer.Header>
                    <Drawer.Title>Edit Material</Drawer.Title>
                </Drawer.Header>
                <Drawer.Body>
                    <Form
                        schema={materialFormSchema}
                        onSubmit={(values) => updateMaterialMutation.mutateAsync(values)}
                        defaultValues={initialValues}
                        formProps={{ id: "edit-material-form" }}
                    >
                        <InputField name="name" label="Name" />
                    </Form>
                </Drawer.Body>
                <Drawer.Footer>
                    <Drawer.Close asChild>
                        <Button variant="secondary">Cancel</Button>
                    </Drawer.Close>
                    <Button
                        type="submit"
                        form="edit-material-form"
                        isLoading={updateMaterialMutation.isPending}
                    >
                        Save
                    </Button>
                </Drawer.Footer>
            </Drawer.Content>
        </Drawer>
    )
}
