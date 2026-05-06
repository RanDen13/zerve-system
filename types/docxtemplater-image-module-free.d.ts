declare module "docxtemplater-image-module-free" {
  import type { DXT } from "docxtemplater";

  type ImageModuleOptions = {
    centered?: boolean;
    fileType?: "docx" | "pptx";
    getImage(tagValue: unknown, tagName: string): Buffer | Uint8Array;
    getSize(
      image: Buffer | Uint8Array,
      tagValue: unknown,
      tagName: string,
    ): [number, number];
  };

  class ImageModule implements DXT.Module {
    constructor(options: ImageModuleOptions);
  }

  export = ImageModule;
}
