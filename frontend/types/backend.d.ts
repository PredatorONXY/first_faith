declare module 'first-faith-backend' {
  export function getCachedNestServer(): Promise<any>;
  export function getCachedNestApp(): Promise<any>;
  export default function serverlessHandler(req: any, res: any): Promise<any>;
  export class ProductsService {
    findAllPublished(): Promise<any[]>;
    findBySlug(slug: string): Promise<any>;
  }
  export class SettingsService {
    getAll(): Promise<Record<string, string>>;
    update(values: Record<string, string>): Promise<Record<string, string>>;
  }
}
