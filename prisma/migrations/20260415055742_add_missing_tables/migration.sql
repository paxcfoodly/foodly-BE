
-- AlterTable
ALTER TABLE "tb_defect" ADD COLUMN     "file_id" INTEGER,
ADD COLUMN     "process_cd" VARCHAR(20),
ADD COLUMN     "remark" VARCHAR(500),
ADD COLUMN     "status" VARCHAR(20) NOT NULL DEFAULT 'REGISTERED';

-- AlterTable
ALTER TABLE "tb_defect_dispose" ADD COLUMN     "approve_dt" TIMESTAMP(3),
ADD COLUMN     "remark" VARCHAR(500);

-- AlterTable
ALTER TABLE "tb_equip_status" ADD COLUMN     "memo" VARCHAR(500);

-- AlterTable
ALTER TABLE "tb_inspect_result" ADD COLUMN     "process_cd" VARCHAR(20),
ADD COLUMN     "remark" VARCHAR(500),
ADD COLUMN     "wo_id" INTEGER;

-- AlterTable
ALTER TABLE "tb_maint_plan" ADD COLUMN     "assignee_id" VARCHAR(20),
ADD COLUMN     "description" VARCHAR(500),
ADD COLUMN     "plan_nm" VARCHAR(100);

-- AlterTable
ALTER TABLE "tb_maint_result" ADD COLUMN     "maint_no" VARCHAR(30),
ADD COLUMN     "maint_plan_id" INTEGER,
ADD COLUMN     "memo" VARCHAR(1000),
ADD COLUMN     "replaced_parts" JSONB;

-- AlterTable
ALTER TABLE "tb_prod_plan" ADD COLUMN     "demand_id" INTEGER;

-- AlterTable
ALTER TABLE "tb_shipment" ADD COLUMN     "actual_ship_dt" TIMESTAMP(3),
ADD COLUMN     "cancel_by" VARCHAR(50),
ADD COLUMN     "cancel_dt" TIMESTAMP(3),
ADD COLUMN     "cancel_reason" VARCHAR(500),
ADD COLUMN     "plan_dt" TIMESTAMP(3),
ADD COLUMN     "remark" VARCHAR(500);

-- AlterTable
ALTER TABLE "tb_shipment_dtl" DROP COLUMN "ship_qty",
ADD COLUMN     "actual_qty" DECIMAL(15,3),
ADD COLUMN     "order_qty" DECIMAL(15,3) NOT NULL;

-- CreateTable
CREATE TABLE "tb_demand" (
    "demand_id" SERIAL NOT NULL,
    "demand_no" VARCHAR(30) NOT NULL,
    "cust_cd" VARCHAR(20),
    "item_cd" VARCHAR(30) NOT NULL,
    "demand_qty" DECIMAL(15,3) NOT NULL,
    "due_date" DATE,
    "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    "remark" VARCHAR(500),
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_demand_pkey" PRIMARY KEY ("demand_id")
);

-- CreateTable
CREATE TABLE "tb_maint_plan_dtl" (
    "plan_dtl_id" SERIAL NOT NULL,
    "maint_plan_id" INTEGER NOT NULL,
    "item_no" INTEGER NOT NULL,
    "check_item" VARCHAR(200) NOT NULL,
    "check_std" VARCHAR(500),
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_maint_plan_dtl_pkey" PRIMARY KEY ("plan_dtl_id")
);

-- CreateTable
CREATE TABLE "tb_maint_result_dtl" (
    "result_dtl_id" SERIAL NOT NULL,
    "maint_result_id" INTEGER NOT NULL,
    "plan_dtl_id" INTEGER,
    "check_item" VARCHAR(200) NOT NULL,
    "check_result" VARCHAR(20) NOT NULL,
    "memo" VARCHAR(500),
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_maint_result_dtl_pkey" PRIMARY KEY ("result_dtl_id")
);

-- CreateTable
CREATE TABLE "tb_sys_setting" (
    "setting_key" VARCHAR(50) NOT NULL,
    "setting_value" VARCHAR(200),
    "setting_group" VARCHAR(30),
    "setting_desc" VARCHAR(200),
    "use_yn" CHAR(1) NOT NULL DEFAULT 'Y',
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_sys_setting_pkey" PRIMARY KEY ("setting_key")
);

-- CreateIndex
CREATE UNIQUE INDEX "tb_demand_demand_no_key" ON "tb_demand"("demand_no");

-- CreateIndex
CREATE INDEX "tb_demand_item_cd_idx" ON "tb_demand"("item_cd");

-- CreateIndex
CREATE INDEX "tb_demand_cust_cd_idx" ON "tb_demand"("cust_cd");

-- CreateIndex
CREATE INDEX "tb_demand_status_idx" ON "tb_demand"("status");

-- CreateIndex
CREATE INDEX "tb_maint_plan_dtl_maint_plan_id_idx" ON "tb_maint_plan_dtl"("maint_plan_id");

-- CreateIndex
CREATE INDEX "tb_maint_result_dtl_maint_result_id_idx" ON "tb_maint_result_dtl"("maint_result_id");

-- CreateIndex
CREATE INDEX "tb_defect_status_idx" ON "tb_defect"("status");

-- CreateIndex
CREATE INDEX "tb_defect_process_cd_idx" ON "tb_defect"("process_cd");

-- CreateIndex
CREATE INDEX "tb_inspect_result_wo_id_idx" ON "tb_inspect_result"("wo_id");

-- CreateIndex
CREATE INDEX "tb_inspect_result_process_cd_idx" ON "tb_inspect_result"("process_cd");

-- CreateIndex
CREATE INDEX "tb_maint_plan_assignee_id_idx" ON "tb_maint_plan"("assignee_id");

-- CreateIndex
CREATE INDEX "tb_maint_result_maint_plan_id_idx" ON "tb_maint_result"("maint_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "tb_prod_plan_demand_id_key" ON "tb_prod_plan"("demand_id");

-- AddForeignKey
ALTER TABLE "tb_demand" ADD CONSTRAINT "tb_demand_cust_cd_fkey" FOREIGN KEY ("cust_cd") REFERENCES "tb_customer"("cust_cd") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_demand" ADD CONSTRAINT "tb_demand_item_cd_fkey" FOREIGN KEY ("item_cd") REFERENCES "tb_item"("item_cd") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_prod_plan" ADD CONSTRAINT "tb_prod_plan_demand_id_fkey" FOREIGN KEY ("demand_id") REFERENCES "tb_demand"("demand_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_inspect_result" ADD CONSTRAINT "tb_inspect_result_wo_id_fkey" FOREIGN KEY ("wo_id") REFERENCES "tb_work_order"("wo_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_inspect_result" ADD CONSTRAINT "tb_inspect_result_process_cd_fkey" FOREIGN KEY ("process_cd") REFERENCES "tb_process"("process_cd") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_defect" ADD CONSTRAINT "tb_defect_process_cd_fkey" FOREIGN KEY ("process_cd") REFERENCES "tb_process"("process_cd") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_maint_plan" ADD CONSTRAINT "tb_maint_plan_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "tb_worker"("worker_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_maint_plan_dtl" ADD CONSTRAINT "tb_maint_plan_dtl_maint_plan_id_fkey" FOREIGN KEY ("maint_plan_id") REFERENCES "tb_maint_plan"("maint_plan_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_maint_result" ADD CONSTRAINT "tb_maint_result_maint_plan_id_fkey" FOREIGN KEY ("maint_plan_id") REFERENCES "tb_maint_plan"("maint_plan_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_maint_result_dtl" ADD CONSTRAINT "tb_maint_result_dtl_maint_result_id_fkey" FOREIGN KEY ("maint_result_id") REFERENCES "tb_maint_result"("maint_result_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_maint_result_dtl" ADD CONSTRAINT "tb_maint_result_dtl_plan_dtl_id_fkey" FOREIGN KEY ("plan_dtl_id") REFERENCES "tb_maint_plan_dtl"("plan_dtl_id") ON DELETE SET NULL ON UPDATE CASCADE;

