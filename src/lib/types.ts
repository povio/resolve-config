export type PlainBasicType = string | number | boolean | null | undefined;

export type PlainType =
  | PlainBasicType
  | PlainNestedType
  | PlainType[]
  | Array<PlainBasicType | PlainNestedType>;

export type PlainNestedType = {
  [key: string]: PlainType;
};
