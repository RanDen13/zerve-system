declare module "docx2pdf-converter" {
  export function convert(
    inputPath: string,
    outputPath: string,
    keepActive?: boolean,
  ): void;

  export function resolvePaths(
    inputPath: string,
    outputPath?: string,
  ): {
    batch: boolean;
    input: string;
    output: string;
  };

  export function extractImages(inputPath: string, outputDir: string): void;

  const converter: {
    convert: typeof convert;
    resolvePaths: typeof resolvePaths;
    extractImages: typeof extractImages;
  };

  export default converter;
}
