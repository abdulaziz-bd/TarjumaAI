export const getTranslation = async () =>
  import("./translation.json").then((module) => module.default);
