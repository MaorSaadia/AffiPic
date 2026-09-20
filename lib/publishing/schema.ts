export type PublicationState = {
  error?: string;
  status?: "draft" | "published";
  success?: string;
};
export type PublicationAction = (
  state: PublicationState,
  form: FormData,
) => Promise<PublicationState>;
