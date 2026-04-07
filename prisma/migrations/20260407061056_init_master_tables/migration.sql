-- CreateTable
CREATE TABLE "tb_company" (
    "company_cd" VARCHAR(20) NOT NULL,
    "company_nm" VARCHAR(100) NOT NULL,
    "biz_no" VARCHAR(20),
    "ceo_nm" VARCHAR(50),
    "address" VARCHAR(500),
    "tel" VARCHAR(20),
    "fax" VARCHAR(20),
    "use_yn" CHAR(1) NOT NULL DEFAULT 'Y',
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_company_pkey" PRIMARY KEY ("company_cd")
);

-- CreateTable
CREATE TABLE "tb_plant" (
    "plant_cd" VARCHAR(20) NOT NULL,
    "company_cd" VARCHAR(20) NOT NULL,
    "plant_nm" VARCHAR(100) NOT NULL,
    "address" VARCHAR(500),
    "use_yn" CHAR(1) NOT NULL DEFAULT 'Y',
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_plant_pkey" PRIMARY KEY ("plant_cd")
);

-- CreateTable
CREATE TABLE "tb_workshop" (
    "workshop_cd" VARCHAR(20) NOT NULL,
    "plant_cd" VARCHAR(20) NOT NULL,
    "parent_cd" VARCHAR(20),
    "workshop_nm" VARCHAR(100) NOT NULL,
    "workshop_type" VARCHAR(20),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "use_yn" CHAR(1) NOT NULL DEFAULT 'Y',
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_workshop_pkey" PRIMARY KEY ("workshop_cd")
);

-- CreateTable
CREATE TABLE "tb_item" (
    "item_cd" VARCHAR(30) NOT NULL,
    "item_nm" VARCHAR(200) NOT NULL,
    "item_type" VARCHAR(10) NOT NULL,
    "unit_cd" VARCHAR(10),
    "spec" VARCHAR(500),
    "drawing_no" VARCHAR(50),
    "safety_stock" DECIMAL(15,3),
    "use_yn" CHAR(1) NOT NULL DEFAULT 'Y',
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_item_pkey" PRIMARY KEY ("item_cd")
);

-- CreateTable
CREATE TABLE "tb_bom" (
    "bom_id" SERIAL NOT NULL,
    "parent_item_cd" VARCHAR(30) NOT NULL,
    "child_item_cd" VARCHAR(30) NOT NULL,
    "level_no" INTEGER NOT NULL DEFAULT 1,
    "qty" DECIMAL(15,5) NOT NULL,
    "loss_rate" DECIMAL(5,2),
    "alt_item_cd" VARCHAR(30),
    "process_cd" VARCHAR(20),
    "use_yn" CHAR(1) NOT NULL DEFAULT 'Y',
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_bom_pkey" PRIMARY KEY ("bom_id")
);

-- CreateTable
CREATE TABLE "tb_process" (
    "process_cd" VARCHAR(20) NOT NULL,
    "process_nm" VARCHAR(100) NOT NULL,
    "process_type" VARCHAR(20),
    "std_time" DECIMAL(10,2),
    "workshop_cd" VARCHAR(20),
    "use_yn" CHAR(1) NOT NULL DEFAULT 'Y',
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_process_pkey" PRIMARY KEY ("process_cd")
);

-- CreateTable
CREATE TABLE "tb_routing" (
    "routing_id" SERIAL NOT NULL,
    "item_cd" VARCHAR(30) NOT NULL,
    "process_cd" VARCHAR(20) NOT NULL,
    "seq_no" INTEGER NOT NULL,
    "std_time" DECIMAL(10,2),
    "setup_time" DECIMAL(10,2),
    "use_yn" CHAR(1) NOT NULL DEFAULT 'Y',
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_routing_pkey" PRIMARY KEY ("routing_id")
);

-- CreateTable
CREATE TABLE "tb_equipment" (
    "equip_cd" VARCHAR(20) NOT NULL,
    "equip_nm" VARCHAR(100) NOT NULL,
    "equip_type" VARCHAR(20),
    "maker" VARCHAR(100),
    "model_nm" VARCHAR(100),
    "install_date" DATE,
    "workshop_cd" VARCHAR(20),
    "use_yn" CHAR(1) NOT NULL DEFAULT 'Y',
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_equipment_pkey" PRIMARY KEY ("equip_cd")
);

-- CreateTable
CREATE TABLE "tb_equip_process" (
    "equip_cd" VARCHAR(20) NOT NULL,
    "process_cd" VARCHAR(20) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_equip_process_pkey" PRIMARY KEY ("equip_cd","process_cd")
);

-- CreateTable
CREATE TABLE "tb_mold" (
    "mold_cd" VARCHAR(20) NOT NULL,
    "mold_nm" VARCHAR(100) NOT NULL,
    "item_cd" VARCHAR(30),
    "warranty_shots" INTEGER,
    "current_shots" INTEGER NOT NULL DEFAULT 0,
    "use_yn" CHAR(1) NOT NULL DEFAULT 'Y',
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_mold_pkey" PRIMARY KEY ("mold_cd")
);

-- CreateTable
CREATE TABLE "tb_worker" (
    "worker_id" VARCHAR(20) NOT NULL,
    "worker_nm" VARCHAR(50) NOT NULL,
    "dept_cd" VARCHAR(20),
    "workshop_cd" VARCHAR(20),
    "shift_cd" VARCHAR(10),
    "use_yn" CHAR(1) NOT NULL DEFAULT 'Y',
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_worker_pkey" PRIMARY KEY ("worker_id")
);

-- CreateTable
CREATE TABLE "tb_worker_skill" (
    "worker_id" VARCHAR(20) NOT NULL,
    "process_cd" VARCHAR(20) NOT NULL,
    "skill_level" INTEGER DEFAULT 1,
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_worker_skill_pkey" PRIMARY KEY ("worker_id","process_cd")
);

-- CreateTable
CREATE TABLE "tb_customer" (
    "cust_cd" VARCHAR(20) NOT NULL,
    "cust_nm" VARCHAR(100) NOT NULL,
    "cust_type" VARCHAR(20),
    "biz_no" VARCHAR(20),
    "contact_nm" VARCHAR(50),
    "tel" VARCHAR(20),
    "email" VARCHAR(100),
    "address" VARCHAR(500),
    "use_yn" CHAR(1) NOT NULL DEFAULT 'Y',
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_customer_pkey" PRIMARY KEY ("cust_cd")
);

-- CreateTable
CREATE TABLE "tb_inspect_std" (
    "inspect_std_id" SERIAL NOT NULL,
    "item_cd" VARCHAR(30),
    "process_cd" VARCHAR(20),
    "inspect_type" VARCHAR(20),
    "inspect_item_nm" VARCHAR(100) NOT NULL,
    "measure_type" VARCHAR(10),
    "lsl" DECIMAL(15,5),
    "target_val" DECIMAL(15,5),
    "usl" DECIMAL(15,5),
    "unit" VARCHAR(10),
    "sampling_std" VARCHAR(50),
    "use_yn" CHAR(1) NOT NULL DEFAULT 'Y',
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_inspect_std_pkey" PRIMARY KEY ("inspect_std_id")
);

-- CreateTable
CREATE TABLE "tb_warehouse" (
    "wh_cd" VARCHAR(20) NOT NULL,
    "wh_nm" VARCHAR(100) NOT NULL,
    "wh_type" VARCHAR(20),
    "plant_cd" VARCHAR(20),
    "use_yn" CHAR(1) NOT NULL DEFAULT 'Y',
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_warehouse_pkey" PRIMARY KEY ("wh_cd")
);

-- CreateIndex
CREATE INDEX "tb_plant_company_cd_idx" ON "tb_plant"("company_cd");

-- CreateIndex
CREATE INDEX "tb_workshop_plant_cd_idx" ON "tb_workshop"("plant_cd");

-- CreateIndex
CREATE INDEX "tb_workshop_parent_cd_idx" ON "tb_workshop"("parent_cd");

-- CreateIndex
CREATE INDEX "tb_item_item_type_idx" ON "tb_item"("item_type");

-- CreateIndex
CREATE INDEX "tb_bom_parent_item_cd_idx" ON "tb_bom"("parent_item_cd");

-- CreateIndex
CREATE INDEX "tb_bom_child_item_cd_idx" ON "tb_bom"("child_item_cd");

-- CreateIndex
CREATE INDEX "tb_process_workshop_cd_idx" ON "tb_process"("workshop_cd");

-- CreateIndex
CREATE INDEX "tb_routing_item_cd_idx" ON "tb_routing"("item_cd");

-- CreateIndex
CREATE INDEX "tb_routing_process_cd_idx" ON "tb_routing"("process_cd");

-- CreateIndex
CREATE UNIQUE INDEX "tb_routing_item_cd_seq_no_key" ON "tb_routing"("item_cd", "seq_no");

-- CreateIndex
CREATE INDEX "tb_equipment_workshop_cd_idx" ON "tb_equipment"("workshop_cd");

-- CreateIndex
CREATE INDEX "tb_equipment_equip_type_idx" ON "tb_equipment"("equip_type");

-- CreateIndex
CREATE INDEX "tb_mold_item_cd_idx" ON "tb_mold"("item_cd");

-- CreateIndex
CREATE INDEX "tb_worker_workshop_cd_idx" ON "tb_worker"("workshop_cd");

-- CreateIndex
CREATE INDEX "tb_inspect_std_item_cd_idx" ON "tb_inspect_std"("item_cd");

-- CreateIndex
CREATE INDEX "tb_inspect_std_process_cd_idx" ON "tb_inspect_std"("process_cd");

-- CreateIndex
CREATE INDEX "tb_warehouse_plant_cd_idx" ON "tb_warehouse"("plant_cd");

-- AddForeignKey
ALTER TABLE "tb_plant" ADD CONSTRAINT "tb_plant_company_cd_fkey" FOREIGN KEY ("company_cd") REFERENCES "tb_company"("company_cd") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_workshop" ADD CONSTRAINT "tb_workshop_plant_cd_fkey" FOREIGN KEY ("plant_cd") REFERENCES "tb_plant"("plant_cd") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_workshop" ADD CONSTRAINT "tb_workshop_parent_cd_fkey" FOREIGN KEY ("parent_cd") REFERENCES "tb_workshop"("workshop_cd") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_bom" ADD CONSTRAINT "tb_bom_parent_item_cd_fkey" FOREIGN KEY ("parent_item_cd") REFERENCES "tb_item"("item_cd") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_bom" ADD CONSTRAINT "tb_bom_child_item_cd_fkey" FOREIGN KEY ("child_item_cd") REFERENCES "tb_item"("item_cd") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_bom" ADD CONSTRAINT "tb_bom_alt_item_cd_fkey" FOREIGN KEY ("alt_item_cd") REFERENCES "tb_item"("item_cd") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_bom" ADD CONSTRAINT "tb_bom_process_cd_fkey" FOREIGN KEY ("process_cd") REFERENCES "tb_process"("process_cd") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_process" ADD CONSTRAINT "tb_process_workshop_cd_fkey" FOREIGN KEY ("workshop_cd") REFERENCES "tb_workshop"("workshop_cd") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_routing" ADD CONSTRAINT "tb_routing_item_cd_fkey" FOREIGN KEY ("item_cd") REFERENCES "tb_item"("item_cd") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_routing" ADD CONSTRAINT "tb_routing_process_cd_fkey" FOREIGN KEY ("process_cd") REFERENCES "tb_process"("process_cd") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_equipment" ADD CONSTRAINT "tb_equipment_workshop_cd_fkey" FOREIGN KEY ("workshop_cd") REFERENCES "tb_workshop"("workshop_cd") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_equip_process" ADD CONSTRAINT "tb_equip_process_equip_cd_fkey" FOREIGN KEY ("equip_cd") REFERENCES "tb_equipment"("equip_cd") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_equip_process" ADD CONSTRAINT "tb_equip_process_process_cd_fkey" FOREIGN KEY ("process_cd") REFERENCES "tb_process"("process_cd") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_mold" ADD CONSTRAINT "tb_mold_item_cd_fkey" FOREIGN KEY ("item_cd") REFERENCES "tb_item"("item_cd") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_worker" ADD CONSTRAINT "tb_worker_workshop_cd_fkey" FOREIGN KEY ("workshop_cd") REFERENCES "tb_workshop"("workshop_cd") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_worker_skill" ADD CONSTRAINT "tb_worker_skill_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "tb_worker"("worker_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_worker_skill" ADD CONSTRAINT "tb_worker_skill_process_cd_fkey" FOREIGN KEY ("process_cd") REFERENCES "tb_process"("process_cd") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_inspect_std" ADD CONSTRAINT "tb_inspect_std_item_cd_fkey" FOREIGN KEY ("item_cd") REFERENCES "tb_item"("item_cd") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_inspect_std" ADD CONSTRAINT "tb_inspect_std_process_cd_fkey" FOREIGN KEY ("process_cd") REFERENCES "tb_process"("process_cd") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_warehouse" ADD CONSTRAINT "tb_warehouse_plant_cd_fkey" FOREIGN KEY ("plant_cd") REFERENCES "tb_plant"("plant_cd") ON DELETE SET NULL ON UPDATE CASCADE;
