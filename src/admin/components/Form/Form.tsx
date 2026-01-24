import { zodResolver } from "@hookform/resolvers/zod"
import { FormProvider, useForm } from "react-hook-form"
import { z } from "zod"

interface FormProps<T extends z.ZodType<any, any>> {
    schema: T
    onSubmit: (values: z.infer<T>) => Promise<void> | void
    children: React.ReactNode
    formProps?: React.FormHTMLAttributes<HTMLFormElement>
    defaultValues?: Partial<z.infer<T>>
}

export const Form = <T extends z.ZodType<any, any>>({
    schema,
    onSubmit,
    children,
    formProps,
    defaultValues,
}: FormProps<T>) => {
    const methods = useForm<z.infer<T>>({
        resolver: zodResolver(schema),
        defaultValues: defaultValues as any,
    })

    return (
        <FormProvider {...methods}>
            <form
                {...formProps}
                onSubmit={methods.handleSubmit(onSubmit)}
            >
                {children}
            </form>
        </FormProvider>
    )
}
