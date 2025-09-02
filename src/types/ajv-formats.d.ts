declare module "ajv-formats" {
  import type { default as Ajv } from "ajv"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export default function addFormats(ajv: Ajv<any> | Ajv, formats?: string[] | { [name: string]: unknown }): unknown
}


