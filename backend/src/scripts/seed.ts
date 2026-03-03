import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

async function seed() {
  try {
    logger.info('Starting database seed...');

    // Create brands
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .upsert([
        {
          name: 'Tetiano',
          shopify_domain: process.env.SHOPIFY_TETIANO_DOMAIN || 'tetiano.myshopify.com',
          shopify_location_id: process.env.SHOPIFY_TETIANO_LOCATION_ID || '12345678',
        },
        {
          name: '98',
          shopify_domain: process.env.SHOPIFY_98_DOMAIN || '98brand.myshopify.com',
          shopify_location_id: process.env.SHOPIFY_98_LOCATION_ID || '87654321',
        },
      ])
      .select();

    if (brandsError) {
      throw brandsError;
    }

    logger.info('Brands created', { count: brands.length });

    // Create a default team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .upsert([{ name: 'Default Team' }])
      .select()
      .single();

    if (teamError) {
      throw teamError;
    }

    logger.info('Team created', { teamId: team.id });

    // Link team to brands
    const { error: teamBrandsError } = await supabase
      .from('team_brands')
      .upsert(
        brands.map((brand) => ({
          team_id: team.id,
          brand_id: brand.id,
        }))
      );

    if (teamBrandsError) {
      throw teamBrandsError;
    }

    logger.info('Team brands linked');

    // Create sample products (optional - will be synced from Shopify)
    const { data: products, error: productsError } = await supabase
      .from('products')
      .upsert([
        {
          brand_id: brands[0].id,
          shopify_product_id: '1234567890',
          title: 'Sample Product 1',
          handle: 'sample-product-1',
          product_type: 'Apparel',
          vendor: 'Tetiano',
          status: 'active',
        },
        {
          brand_id: brands[1].id,
          shopify_product_id: '0987654321',
          title: 'Sample Product 2',
          handle: 'sample-product-2',
          product_type: 'Accessories',
          vendor: '98',
          status: 'active',
        },
      ])
      .select();

    if (productsError) {
      throw productsError;
    }

    logger.info('Sample products created', { count: products.length });

    // Create sample variants
    const { data: variants, error: variantsError } = await supabase
      .from('variants')
      .upsert([
        {
          product_id: products[0].id,
          brand_id: brands[0].id,
          shopify_variant_id: '11111111',
          title: 'Small / Red',
          sku: 'SAMPLE-1-SM-RED',
          price: 29.99,
        },
        {
          product_id: products[0].id,
          brand_id: brands[0].id,
          shopify_variant_id: '22222222',
          title: 'Medium / Blue',
          sku: 'SAMPLE-1-MD-BLUE',
          price: 29.99,
        },
        {
          product_id: products[1].id,
          brand_id: brands[1].id,
          shopify_variant_id: '33333333',
          title: 'One Size',
          sku: 'SAMPLE-2-OS',
          price: 19.99,
        },
      ])
      .select();

    if (variantsError) {
      throw variantsError;
    }

    logger.info('Sample variants created', { count: variants.length });

    // Create initial inventory levels
    const { error: inventoryError } = await supabase
      .from('inventory_levels')
      .upsert(
        variants.map((variant) => ({
          variant_id: variant.id,
          brand_id: variant.brand_id,
          available: 100,
        }))
      );

    if (inventoryError) {
      throw inventoryError;
    }

    logger.info('Initial inventory levels set');

    logger.info('Seed completed successfully!');
    logger.info('Next steps:');
    logger.info('1. Sign up a user at /signup');
    logger.info('2. Manually assign user to team with admin role');
    logger.info('3. Configure Shopify webhooks');
    logger.info('4. Sync products from Shopify');
  } catch (error: any) {
    logger.error('Seed failed', { error: error.message });
    process.exit(1);
  }
}

seed();
