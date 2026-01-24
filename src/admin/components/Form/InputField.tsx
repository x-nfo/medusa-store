import { Input, Label } from "@medusajs/ui"
import { useFormContext } from "react-hook-form"

interface InputFieldProps {
    name: string
    label: string
    type?: string
    inputProps?: React.InputHTMLAttributes<HTMLInputElement>
}

export const InputField = ({ name, label, type = "text", inputProps }: InputFieldProps) => {
    const { register } = useFormContext()

    return (
        <div className="flex flex-col gap-2">
            <Label htmlFor={name}>{label}</Label>
            <Input id={name} type={type} {...register(name)} {...inputProps} />
        </div>
    )
}
