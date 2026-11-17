BEGIN;
ALTER TABLE "app_menus" ADD COLUMN "kind" VARCHAR(20) NOT NULL DEFAULT 'page';
ALTER TABLE "app_menus" ALTER COLUMN "path" DROP NOT NULL;
ALTER TABLE "app_menus" DROP CONSTRAINT "app_menus_check";
UPDATE "app_menus" m SET "kind" = 'directory', "path" = NULL, "feature_code" = NULL, "min_role" = 'user'
WHERE EXISTS (SELECT 1 FROM "app_menus" c WHERE c."parent_code" = m."code");
ALTER TABLE "app_menus" ADD CONSTRAINT "app_menus_kind_check" CHECK ("kind" IN ('directory', 'page'));
ALTER TABLE "app_menus" ADD CONSTRAINT "app_menus_page_path_check" CHECK ("kind" <> 'page' OR "path" IS NOT NULL);
ALTER TABLE "app_menus" ADD CONSTRAINT "app_menus_feature_check" CHECK (
  ("kind" = 'directory' AND "feature_code" IS NULL) OR
  ("kind" = 'page' AND (("scope" = 'tenant' AND "feature_code" IS NOT NULL) OR ("scope" <> 'tenant' AND "feature_code" IS NULL)))
);
COMMIT;
