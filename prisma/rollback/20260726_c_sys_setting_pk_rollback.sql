BEGIN;
ALTER TABLE "tb_sys_setting" DROP CONSTRAINT "tb_sys_setting_pkey";
ALTER TABLE "tb_sys_setting" ADD CONSTRAINT "tb_sys_setting_pkey" PRIMARY KEY ("setting_key");
COMMIT;
