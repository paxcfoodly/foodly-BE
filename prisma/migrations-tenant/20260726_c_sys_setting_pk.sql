-- Migration C: tb_sys_setting PK를 (company_cd, setting_key) 복합키로 — 회사별 동일 설정키 허용
BEGIN;
ALTER TABLE "tb_sys_setting" DROP CONSTRAINT "tb_sys_setting_pkey";
ALTER TABLE "tb_sys_setting" ADD CONSTRAINT "tb_sys_setting_pkey" PRIMARY KEY ("company_cd", "setting_key");
COMMIT;
