-- CreateTable
CREATE TABLE "tb_prod_plan" (
    "plan_id" SERIAL NOT NULL,
    "plan_no" VARCHAR(30) NOT NULL,
    "plant_cd" VARCHAR(20) NOT NULL,
    "item_cd" VARCHAR(30) NOT NULL,
    "plan_qty" DECIMAL(15,3) NOT NULL,
    "due_date" DATE NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PLAN',
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_prod_plan_pkey" PRIMARY KEY ("plan_id")
);

-- CreateTable
CREATE TABLE "tb_work_order" (
    "wo_id" SERIAL NOT NULL,
    "wo_no" VARCHAR(30) NOT NULL,
    "plan_id" INTEGER,
    "item_cd" VARCHAR(30) NOT NULL,
    "order_qty" DECIMAL(15,3) NOT NULL,
    "good_qty" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "defect_qty" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "status" VARCHAR(20) NOT NULL DEFAULT 'WAIT',
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_work_order_pkey" PRIMARY KEY ("wo_id")
);

-- CreateTable
CREATE TABLE "tb_wo_process" (
    "wo_process_id" SERIAL NOT NULL,
    "wo_id" INTEGER NOT NULL,
    "process_cd" VARCHAR(20) NOT NULL,
    "seq_no" INTEGER NOT NULL,
    "equip_cd" VARCHAR(20),
    "status" VARCHAR(20) NOT NULL DEFAULT 'WAIT',
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_wo_process_pkey" PRIMARY KEY ("wo_process_id")
);

-- CreateTable
CREATE TABLE "tb_wo_worker" (
    "wo_id" INTEGER NOT NULL,
    "worker_id" VARCHAR(20) NOT NULL,
    "assign_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_wo_worker_pkey" PRIMARY KEY ("wo_id","worker_id")
);

-- CreateTable
CREATE TABLE "tb_prod_result" (
    "result_id" SERIAL NOT NULL,
    "wo_id" INTEGER NOT NULL,
    "lot_no" VARCHAR(50),
    "equip_cd" VARCHAR(20),
    "worker_id" VARCHAR(20),
    "good_qty" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "defect_qty" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "work_start_dt" TIMESTAMP(3),
    "work_end_dt" TIMESTAMP(3),
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_prod_result_pkey" PRIMARY KEY ("result_id")
);

-- CreateTable
CREATE TABLE "tb_lot" (
    "lot_no" VARCHAR(50) NOT NULL,
    "item_cd" VARCHAR(30) NOT NULL,
    "lot_qty" DECIMAL(15,3) NOT NULL,
    "lot_status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "create_type" VARCHAR(20),
    "parent_lot_no" VARCHAR(50),
    "wo_id" INTEGER,
    "wh_cd" VARCHAR(20),
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_lot_pkey" PRIMARY KEY ("lot_no")
);

-- CreateTable
CREATE TABLE "tb_lot_history" (
    "lot_hist_id" SERIAL NOT NULL,
    "lot_no" VARCHAR(50) NOT NULL,
    "event_type" VARCHAR(20) NOT NULL,
    "event_detail" VARCHAR(500),
    "qty" DECIMAL(15,3),
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_lot_history_pkey" PRIMARY KEY ("lot_hist_id")
);

-- CreateTable
CREATE TABLE "tb_material_input" (
    "input_id" SERIAL NOT NULL,
    "wo_id" INTEGER NOT NULL,
    "item_cd" VARCHAR(30) NOT NULL,
    "lot_no" VARCHAR(50),
    "input_qty" DECIMAL(15,3) NOT NULL,
    "worker_id" VARCHAR(20),
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_material_input_pkey" PRIMARY KEY ("input_id")
);

-- CreateTable
CREATE TABLE "tb_material_issue" (
    "issue_id" SERIAL NOT NULL,
    "issue_no" VARCHAR(30) NOT NULL,
    "wo_id" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_material_issue_pkey" PRIMARY KEY ("issue_id")
);

-- CreateTable
CREATE TABLE "tb_material_issue_dtl" (
    "issue_dtl_id" SERIAL NOT NULL,
    "issue_id" INTEGER NOT NULL,
    "item_cd" VARCHAR(30) NOT NULL,
    "lot_no" VARCHAR(50),
    "request_qty" DECIMAL(15,3) NOT NULL,
    "issue_qty" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_material_issue_dtl_pkey" PRIMARY KEY ("issue_dtl_id")
);

-- CreateTable
CREATE TABLE "tb_inspect_result" (
    "inspect_id" SERIAL NOT NULL,
    "inspect_no" VARCHAR(30) NOT NULL,
    "inspect_type" VARCHAR(20),
    "item_cd" VARCHAR(30),
    "lot_no" VARCHAR(50),
    "judge" VARCHAR(20),
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_inspect_result_pkey" PRIMARY KEY ("inspect_id")
);

-- CreateTable
CREATE TABLE "tb_inspect_result_dtl" (
    "inspect_dtl_id" SERIAL NOT NULL,
    "inspect_id" INTEGER NOT NULL,
    "inspect_std_id" INTEGER,
    "measure_value" DECIMAL(15,5),
    "judge" VARCHAR(20),
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_inspect_result_dtl_pkey" PRIMARY KEY ("inspect_dtl_id")
);

-- CreateTable
CREATE TABLE "tb_defect" (
    "defect_id" SERIAL NOT NULL,
    "defect_no" VARCHAR(30) NOT NULL,
    "wo_id" INTEGER,
    "item_cd" VARCHAR(30),
    "lot_no" VARCHAR(50),
    "defect_type_cd" VARCHAR(20),
    "defect_cause_cd" VARCHAR(20),
    "defect_qty" DECIMAL(15,3) NOT NULL,
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_defect_pkey" PRIMARY KEY ("defect_id")
);

-- CreateTable
CREATE TABLE "tb_defect_dispose" (
    "dispose_id" SERIAL NOT NULL,
    "defect_id" INTEGER NOT NULL,
    "dispose_type" VARCHAR(20),
    "dispose_qty" DECIMAL(15,3) NOT NULL,
    "approve_by" VARCHAR(50),
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_defect_dispose_pkey" PRIMARY KEY ("dispose_id")
);

-- CreateTable
CREATE TABLE "tb_equip_status" (
    "status_id" SERIAL NOT NULL,
    "equip_cd" VARCHAR(20) NOT NULL,
    "status_type" VARCHAR(20) NOT NULL,
    "down_reason_cd" VARCHAR(20),
    "start_dt" TIMESTAMP(3),
    "end_dt" TIMESTAMP(3),
    "duration" INTEGER,
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_equip_status_pkey" PRIMARY KEY ("status_id")
);

-- CreateTable
CREATE TABLE "tb_maint_plan" (
    "maint_plan_id" SERIAL NOT NULL,
    "equip_cd" VARCHAR(20) NOT NULL,
    "maint_type_cd" VARCHAR(20),
    "cycle_type" VARCHAR(20),
    "next_plan_date" DATE,
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_maint_plan_pkey" PRIMARY KEY ("maint_plan_id")
);

-- CreateTable
CREATE TABLE "tb_maint_result" (
    "maint_result_id" SERIAL NOT NULL,
    "equip_cd" VARCHAR(20) NOT NULL,
    "maint_type_cd" VARCHAR(20),
    "work_dt" DATE,
    "worker_id" VARCHAR(20),
    "cost" DECIMAL(15,2),
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_maint_result_pkey" PRIMARY KEY ("maint_result_id")
);

-- CreateTable
CREATE TABLE "tb_inventory" (
    "inventory_id" SERIAL NOT NULL,
    "item_cd" VARCHAR(30) NOT NULL,
    "lot_no" VARCHAR(50),
    "wh_cd" VARCHAR(20) NOT NULL,
    "qty" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "allocated_qty" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "available_qty" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_inventory_pkey" PRIMARY KEY ("inventory_id")
);

-- CreateTable
CREATE TABLE "tb_inventory_tx" (
    "tx_id" SERIAL NOT NULL,
    "item_cd" VARCHAR(30) NOT NULL,
    "lot_no" VARCHAR(50),
    "tx_type" VARCHAR(20) NOT NULL,
    "tx_qty" DECIMAL(15,3) NOT NULL,
    "before_qty" DECIMAL(15,3) NOT NULL,
    "after_qty" DECIMAL(15,3) NOT NULL,
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_inventory_tx_pkey" PRIMARY KEY ("tx_id")
);

-- CreateTable
CREATE TABLE "tb_inventory_adjust" (
    "adjust_id" SERIAL NOT NULL,
    "item_cd" VARCHAR(30) NOT NULL,
    "lot_no" VARCHAR(50),
    "adjust_qty" DECIMAL(15,3) NOT NULL,
    "adjust_reason" VARCHAR(500),
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_inventory_adjust_pkey" PRIMARY KEY ("adjust_id")
);

-- CreateTable
CREATE TABLE "tb_shipment" (
    "ship_id" SERIAL NOT NULL,
    "ship_no" VARCHAR(30) NOT NULL,
    "cust_cd" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PLAN',
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_shipment_pkey" PRIMARY KEY ("ship_id")
);

-- CreateTable
CREATE TABLE "tb_shipment_dtl" (
    "ship_dtl_id" SERIAL NOT NULL,
    "ship_id" INTEGER NOT NULL,
    "item_cd" VARCHAR(30) NOT NULL,
    "lot_no" VARCHAR(50),
    "ship_qty" DECIMAL(15,3) NOT NULL,
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_shipment_dtl_pkey" PRIMARY KEY ("ship_dtl_id")
);

-- CreateTable
CREATE TABLE "tb_incoming" (
    "incoming_id" SERIAL NOT NULL,
    "incoming_no" VARCHAR(30) NOT NULL,
    "cust_cd" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PLAN',
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_incoming_pkey" PRIMARY KEY ("incoming_id")
);

-- CreateTable
CREATE TABLE "tb_incoming_dtl" (
    "incoming_dtl_id" SERIAL NOT NULL,
    "incoming_id" INTEGER NOT NULL,
    "item_cd" VARCHAR(30) NOT NULL,
    "lot_no" VARCHAR(50),
    "incoming_qty" DECIMAL(15,3) NOT NULL,
    "inspect_status" VARCHAR(20),
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_incoming_dtl_pkey" PRIMARY KEY ("incoming_dtl_id")
);

-- CreateTable
CREATE TABLE "tb_user" (
    "user_id" SERIAL NOT NULL,
    "login_id" VARCHAR(50) NOT NULL,
    "password" VARCHAR(200) NOT NULL,
    "user_nm" VARCHAR(50) NOT NULL,
    "role_cd" VARCHAR(20),
    "company_cd" VARCHAR(20),
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_user_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "tb_role" (
    "role_cd" VARCHAR(20) NOT NULL,
    "role_nm" VARCHAR(50) NOT NULL,
    "role_desc" VARCHAR(200),
    "use_yn" CHAR(1) NOT NULL DEFAULT 'Y',
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_role_pkey" PRIMARY KEY ("role_cd")
);

-- CreateTable
CREATE TABLE "tb_menu" (
    "menu_id" SERIAL NOT NULL,
    "parent_menu_id" INTEGER,
    "menu_nm" VARCHAR(100) NOT NULL,
    "menu_url" VARCHAR(200),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "depth" INTEGER NOT NULL DEFAULT 1,
    "use_yn" CHAR(1) NOT NULL DEFAULT 'Y',
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_menu_pkey" PRIMARY KEY ("menu_id")
);

-- CreateTable
CREATE TABLE "tb_role_menu" (
    "role_cd" VARCHAR(20) NOT NULL,
    "menu_id" INTEGER NOT NULL,
    "can_create" CHAR(1) NOT NULL DEFAULT 'N',
    "can_read" CHAR(1) NOT NULL DEFAULT 'Y',
    "can_update" CHAR(1) NOT NULL DEFAULT 'N',
    "can_delete" CHAR(1) NOT NULL DEFAULT 'N',
    "can_print" CHAR(1) NOT NULL DEFAULT 'N',
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_role_menu_pkey" PRIMARY KEY ("role_cd","menu_id")
);

-- CreateTable
CREATE TABLE "tb_common_code_grp" (
    "group_cd" VARCHAR(30) NOT NULL,
    "group_nm" VARCHAR(100) NOT NULL,
    "use_yn" CHAR(1) NOT NULL DEFAULT 'Y',
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_common_code_grp_pkey" PRIMARY KEY ("group_cd")
);

-- CreateTable
CREATE TABLE "tb_common_code" (
    "group_cd" VARCHAR(30) NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "code_nm" VARCHAR(100) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "use_yn" CHAR(1) NOT NULL DEFAULT 'Y',
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_common_code_pkey" PRIMARY KEY ("group_cd","code")
);

-- CreateTable
CREATE TABLE "tb_numbering" (
    "num_type" VARCHAR(30) NOT NULL,
    "prefix" VARCHAR(10) NOT NULL,
    "date_format" VARCHAR(10) NOT NULL DEFAULT 'YYMMDD',
    "seq_length" INTEGER NOT NULL DEFAULT 4,
    "last_seq" INTEGER NOT NULL DEFAULT 0,
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_numbering_pkey" PRIMARY KEY ("num_type")
);

-- CreateTable
CREATE TABLE "tb_file" (
    "file_id" SERIAL NOT NULL,
    "original_nm" VARCHAR(200) NOT NULL,
    "stored_nm" VARCHAR(200) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "file_size" INTEGER,
    "file_ext" VARCHAR(10),
    "ref_table" VARCHAR(50),
    "ref_id" VARCHAR(50),
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_file_pkey" PRIMARY KEY ("file_id")
);

-- CreateTable
CREATE TABLE "tb_audit_log" (
    "log_id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "action" VARCHAR(20) NOT NULL,
    "target_table" VARCHAR(50),
    "record_id" VARCHAR(50),
    "before_data" JSONB,
    "after_data" JSONB,
    "ip_address" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_audit_log_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "tb_notification" (
    "noti_id" SERIAL NOT NULL,
    "noti_type" VARCHAR(20),
    "noti_title" VARCHAR(200) NOT NULL,
    "noti_content" TEXT,
    "target_user_id" INTEGER,
    "channel" VARCHAR(20),
    "send_status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "read_yn" CHAR(1) NOT NULL DEFAULT 'N',
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_notification_pkey" PRIMARY KEY ("noti_id")
);

-- CreateTable
CREATE TABLE "tb_noti_rule" (
    "rule_id" SERIAL NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "target_role_cd" VARCHAR(20),
    "channel" VARCHAR(20),
    "template_id" VARCHAR(50),
    "use_yn" CHAR(1) NOT NULL DEFAULT 'Y',
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_noti_rule_pkey" PRIMARY KEY ("rule_id")
);

-- CreateTable
CREATE TABLE "tb_batch_log" (
    "batch_log_id" SERIAL NOT NULL,
    "batch_nm" VARCHAR(100) NOT NULL,
    "start_dt" TIMESTAMP(3),
    "end_dt" TIMESTAMP(3),
    "status" VARCHAR(20) NOT NULL DEFAULT 'RUNNING',
    "result_msg" TEXT,
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_batch_log_pkey" PRIMARY KEY ("batch_log_id")
);

-- CreateTable
CREATE TABLE "tb_notice" (
    "notice_id" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT,
    "is_popup" CHAR(1) NOT NULL DEFAULT 'N',
    "create_by" VARCHAR(50),
    "create_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_dt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_notice_pkey" PRIMARY KEY ("notice_id")
);

-- CreateTable
CREATE TABLE "tb_data_history" (
    "history_id" SERIAL NOT NULL,
    "table_nm" VARCHAR(50) NOT NULL,
    "record_id" VARCHAR(50) NOT NULL,
    "column_nm" VARCHAR(50) NOT NULL,
    "before_value" TEXT,
    "after_value" TEXT,
    "change_reason" VARCHAR(500),
    "change_by" VARCHAR(50),
    "change_dt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_data_history_pkey" PRIMARY KEY ("history_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tb_prod_plan_plan_no_key" ON "tb_prod_plan"("plan_no");

-- CreateIndex
CREATE INDEX "tb_prod_plan_plant_cd_idx" ON "tb_prod_plan"("plant_cd");

-- CreateIndex
CREATE INDEX "tb_prod_plan_item_cd_idx" ON "tb_prod_plan"("item_cd");

-- CreateIndex
CREATE INDEX "tb_prod_plan_status_idx" ON "tb_prod_plan"("status");

-- CreateIndex
CREATE INDEX "tb_prod_plan_due_date_idx" ON "tb_prod_plan"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "tb_work_order_wo_no_key" ON "tb_work_order"("wo_no");

-- CreateIndex
CREATE INDEX "tb_work_order_plan_id_idx" ON "tb_work_order"("plan_id");

-- CreateIndex
CREATE INDEX "tb_work_order_item_cd_idx" ON "tb_work_order"("item_cd");

-- CreateIndex
CREATE INDEX "tb_work_order_status_idx" ON "tb_work_order"("status");

-- CreateIndex
CREATE INDEX "tb_wo_process_wo_id_idx" ON "tb_wo_process"("wo_id");

-- CreateIndex
CREATE INDEX "tb_wo_process_process_cd_idx" ON "tb_wo_process"("process_cd");

-- CreateIndex
CREATE INDEX "tb_prod_result_wo_id_idx" ON "tb_prod_result"("wo_id");

-- CreateIndex
CREATE INDEX "tb_prod_result_lot_no_idx" ON "tb_prod_result"("lot_no");

-- CreateIndex
CREATE INDEX "tb_prod_result_equip_cd_idx" ON "tb_prod_result"("equip_cd");

-- CreateIndex
CREATE INDEX "tb_prod_result_worker_id_idx" ON "tb_prod_result"("worker_id");

-- CreateIndex
CREATE INDEX "tb_lot_item_cd_idx" ON "tb_lot"("item_cd");

-- CreateIndex
CREATE INDEX "tb_lot_wo_id_idx" ON "tb_lot"("wo_id");

-- CreateIndex
CREATE INDEX "tb_lot_wh_cd_idx" ON "tb_lot"("wh_cd");

-- CreateIndex
CREATE INDEX "tb_lot_lot_status_idx" ON "tb_lot"("lot_status");

-- CreateIndex
CREATE INDEX "tb_lot_history_lot_no_idx" ON "tb_lot_history"("lot_no");

-- CreateIndex
CREATE INDEX "tb_lot_history_create_dt_idx" ON "tb_lot_history"("create_dt");

-- CreateIndex
CREATE INDEX "tb_material_input_wo_id_idx" ON "tb_material_input"("wo_id");

-- CreateIndex
CREATE INDEX "tb_material_input_item_cd_idx" ON "tb_material_input"("item_cd");

-- CreateIndex
CREATE UNIQUE INDEX "tb_material_issue_issue_no_key" ON "tb_material_issue"("issue_no");

-- CreateIndex
CREATE INDEX "tb_material_issue_wo_id_idx" ON "tb_material_issue"("wo_id");

-- CreateIndex
CREATE INDEX "tb_material_issue_dtl_issue_id_idx" ON "tb_material_issue_dtl"("issue_id");

-- CreateIndex
CREATE INDEX "tb_material_issue_dtl_item_cd_idx" ON "tb_material_issue_dtl"("item_cd");

-- CreateIndex
CREATE UNIQUE INDEX "tb_inspect_result_inspect_no_key" ON "tb_inspect_result"("inspect_no");

-- CreateIndex
CREATE INDEX "tb_inspect_result_item_cd_idx" ON "tb_inspect_result"("item_cd");

-- CreateIndex
CREATE INDEX "tb_inspect_result_lot_no_idx" ON "tb_inspect_result"("lot_no");

-- CreateIndex
CREATE INDEX "tb_inspect_result_inspect_type_idx" ON "tb_inspect_result"("inspect_type");

-- CreateIndex
CREATE INDEX "tb_inspect_result_dtl_inspect_id_idx" ON "tb_inspect_result_dtl"("inspect_id");

-- CreateIndex
CREATE INDEX "tb_inspect_result_dtl_inspect_std_id_idx" ON "tb_inspect_result_dtl"("inspect_std_id");

-- CreateIndex
CREATE UNIQUE INDEX "tb_defect_defect_no_key" ON "tb_defect"("defect_no");

-- CreateIndex
CREATE INDEX "tb_defect_wo_id_idx" ON "tb_defect"("wo_id");

-- CreateIndex
CREATE INDEX "tb_defect_lot_no_idx" ON "tb_defect"("lot_no");

-- CreateIndex
CREATE INDEX "tb_defect_defect_type_cd_idx" ON "tb_defect"("defect_type_cd");

-- CreateIndex
CREATE INDEX "tb_defect_dispose_defect_id_idx" ON "tb_defect_dispose"("defect_id");

-- CreateIndex
CREATE INDEX "tb_equip_status_equip_cd_idx" ON "tb_equip_status"("equip_cd");

-- CreateIndex
CREATE INDEX "tb_equip_status_start_dt_idx" ON "tb_equip_status"("start_dt");

-- CreateIndex
CREATE INDEX "tb_maint_plan_equip_cd_idx" ON "tb_maint_plan"("equip_cd");

-- CreateIndex
CREATE INDEX "tb_maint_plan_next_plan_date_idx" ON "tb_maint_plan"("next_plan_date");

-- CreateIndex
CREATE INDEX "tb_maint_result_equip_cd_idx" ON "tb_maint_result"("equip_cd");

-- CreateIndex
CREATE INDEX "tb_maint_result_worker_id_idx" ON "tb_maint_result"("worker_id");

-- CreateIndex
CREATE INDEX "tb_inventory_item_cd_idx" ON "tb_inventory"("item_cd");

-- CreateIndex
CREATE INDEX "tb_inventory_wh_cd_idx" ON "tb_inventory"("wh_cd");

-- CreateIndex
CREATE UNIQUE INDEX "tb_inventory_item_cd_lot_no_wh_cd_key" ON "tb_inventory"("item_cd", "lot_no", "wh_cd");

-- CreateIndex
CREATE INDEX "tb_inventory_tx_item_cd_idx" ON "tb_inventory_tx"("item_cd");

-- CreateIndex
CREATE INDEX "tb_inventory_tx_lot_no_idx" ON "tb_inventory_tx"("lot_no");

-- CreateIndex
CREATE INDEX "tb_inventory_tx_create_dt_idx" ON "tb_inventory_tx"("create_dt");

-- CreateIndex
CREATE INDEX "tb_inventory_adjust_item_cd_idx" ON "tb_inventory_adjust"("item_cd");

-- CreateIndex
CREATE UNIQUE INDEX "tb_shipment_ship_no_key" ON "tb_shipment"("ship_no");

-- CreateIndex
CREATE INDEX "tb_shipment_cust_cd_idx" ON "tb_shipment"("cust_cd");

-- CreateIndex
CREATE INDEX "tb_shipment_dtl_ship_id_idx" ON "tb_shipment_dtl"("ship_id");

-- CreateIndex
CREATE INDEX "tb_shipment_dtl_item_cd_idx" ON "tb_shipment_dtl"("item_cd");

-- CreateIndex
CREATE UNIQUE INDEX "tb_incoming_incoming_no_key" ON "tb_incoming"("incoming_no");

-- CreateIndex
CREATE INDEX "tb_incoming_cust_cd_idx" ON "tb_incoming"("cust_cd");

-- CreateIndex
CREATE INDEX "tb_incoming_dtl_incoming_id_idx" ON "tb_incoming_dtl"("incoming_id");

-- CreateIndex
CREATE INDEX "tb_incoming_dtl_item_cd_idx" ON "tb_incoming_dtl"("item_cd");

-- CreateIndex
CREATE UNIQUE INDEX "tb_user_login_id_key" ON "tb_user"("login_id");

-- CreateIndex
CREATE INDEX "tb_user_role_cd_idx" ON "tb_user"("role_cd");

-- CreateIndex
CREATE INDEX "tb_user_company_cd_idx" ON "tb_user"("company_cd");

-- CreateIndex
CREATE INDEX "tb_menu_parent_menu_id_idx" ON "tb_menu"("parent_menu_id");

-- CreateIndex
CREATE INDEX "tb_file_ref_table_ref_id_idx" ON "tb_file"("ref_table", "ref_id");

-- CreateIndex
CREATE INDEX "tb_audit_log_user_id_idx" ON "tb_audit_log"("user_id");

-- CreateIndex
CREATE INDEX "tb_audit_log_target_table_idx" ON "tb_audit_log"("target_table");

-- CreateIndex
CREATE INDEX "tb_audit_log_create_dt_idx" ON "tb_audit_log"("create_dt");

-- CreateIndex
CREATE INDEX "tb_notification_target_user_id_idx" ON "tb_notification"("target_user_id");

-- CreateIndex
CREATE INDEX "tb_notification_read_yn_idx" ON "tb_notification"("read_yn");

-- CreateIndex
CREATE INDEX "tb_noti_rule_event_type_idx" ON "tb_noti_rule"("event_type");

-- CreateIndex
CREATE INDEX "tb_batch_log_batch_nm_idx" ON "tb_batch_log"("batch_nm");

-- CreateIndex
CREATE INDEX "tb_batch_log_start_dt_idx" ON "tb_batch_log"("start_dt");

-- CreateIndex
CREATE INDEX "tb_data_history_table_nm_record_id_idx" ON "tb_data_history"("table_nm", "record_id");

-- CreateIndex
CREATE INDEX "tb_data_history_change_dt_idx" ON "tb_data_history"("change_dt");

-- AddForeignKey
ALTER TABLE "tb_prod_plan" ADD CONSTRAINT "tb_prod_plan_plant_cd_fkey" FOREIGN KEY ("plant_cd") REFERENCES "tb_plant"("plant_cd") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_prod_plan" ADD CONSTRAINT "tb_prod_plan_item_cd_fkey" FOREIGN KEY ("item_cd") REFERENCES "tb_item"("item_cd") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_work_order" ADD CONSTRAINT "tb_work_order_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "tb_prod_plan"("plan_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_work_order" ADD CONSTRAINT "tb_work_order_item_cd_fkey" FOREIGN KEY ("item_cd") REFERENCES "tb_item"("item_cd") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_wo_process" ADD CONSTRAINT "tb_wo_process_wo_id_fkey" FOREIGN KEY ("wo_id") REFERENCES "tb_work_order"("wo_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_wo_process" ADD CONSTRAINT "tb_wo_process_process_cd_fkey" FOREIGN KEY ("process_cd") REFERENCES "tb_process"("process_cd") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_wo_process" ADD CONSTRAINT "tb_wo_process_equip_cd_fkey" FOREIGN KEY ("equip_cd") REFERENCES "tb_equipment"("equip_cd") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_wo_worker" ADD CONSTRAINT "tb_wo_worker_wo_id_fkey" FOREIGN KEY ("wo_id") REFERENCES "tb_work_order"("wo_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_wo_worker" ADD CONSTRAINT "tb_wo_worker_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "tb_worker"("worker_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_prod_result" ADD CONSTRAINT "tb_prod_result_wo_id_fkey" FOREIGN KEY ("wo_id") REFERENCES "tb_work_order"("wo_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_prod_result" ADD CONSTRAINT "tb_prod_result_lot_no_fkey" FOREIGN KEY ("lot_no") REFERENCES "tb_lot"("lot_no") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_prod_result" ADD CONSTRAINT "tb_prod_result_equip_cd_fkey" FOREIGN KEY ("equip_cd") REFERENCES "tb_equipment"("equip_cd") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_prod_result" ADD CONSTRAINT "tb_prod_result_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "tb_worker"("worker_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_lot" ADD CONSTRAINT "tb_lot_item_cd_fkey" FOREIGN KEY ("item_cd") REFERENCES "tb_item"("item_cd") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_lot" ADD CONSTRAINT "tb_lot_parent_lot_no_fkey" FOREIGN KEY ("parent_lot_no") REFERENCES "tb_lot"("lot_no") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_lot" ADD CONSTRAINT "tb_lot_wo_id_fkey" FOREIGN KEY ("wo_id") REFERENCES "tb_work_order"("wo_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_lot" ADD CONSTRAINT "tb_lot_wh_cd_fkey" FOREIGN KEY ("wh_cd") REFERENCES "tb_warehouse"("wh_cd") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_lot_history" ADD CONSTRAINT "tb_lot_history_lot_no_fkey" FOREIGN KEY ("lot_no") REFERENCES "tb_lot"("lot_no") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_material_input" ADD CONSTRAINT "tb_material_input_wo_id_fkey" FOREIGN KEY ("wo_id") REFERENCES "tb_work_order"("wo_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_material_input" ADD CONSTRAINT "tb_material_input_item_cd_fkey" FOREIGN KEY ("item_cd") REFERENCES "tb_item"("item_cd") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_material_input" ADD CONSTRAINT "tb_material_input_lot_no_fkey" FOREIGN KEY ("lot_no") REFERENCES "tb_lot"("lot_no") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_material_input" ADD CONSTRAINT "tb_material_input_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "tb_worker"("worker_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_material_issue" ADD CONSTRAINT "tb_material_issue_wo_id_fkey" FOREIGN KEY ("wo_id") REFERENCES "tb_work_order"("wo_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_material_issue_dtl" ADD CONSTRAINT "tb_material_issue_dtl_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "tb_material_issue"("issue_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_material_issue_dtl" ADD CONSTRAINT "tb_material_issue_dtl_item_cd_fkey" FOREIGN KEY ("item_cd") REFERENCES "tb_item"("item_cd") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_material_issue_dtl" ADD CONSTRAINT "tb_material_issue_dtl_lot_no_fkey" FOREIGN KEY ("lot_no") REFERENCES "tb_lot"("lot_no") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_inspect_result" ADD CONSTRAINT "tb_inspect_result_item_cd_fkey" FOREIGN KEY ("item_cd") REFERENCES "tb_item"("item_cd") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_inspect_result" ADD CONSTRAINT "tb_inspect_result_lot_no_fkey" FOREIGN KEY ("lot_no") REFERENCES "tb_lot"("lot_no") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_inspect_result_dtl" ADD CONSTRAINT "tb_inspect_result_dtl_inspect_id_fkey" FOREIGN KEY ("inspect_id") REFERENCES "tb_inspect_result"("inspect_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_inspect_result_dtl" ADD CONSTRAINT "tb_inspect_result_dtl_inspect_std_id_fkey" FOREIGN KEY ("inspect_std_id") REFERENCES "tb_inspect_std"("inspect_std_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_defect" ADD CONSTRAINT "tb_defect_wo_id_fkey" FOREIGN KEY ("wo_id") REFERENCES "tb_work_order"("wo_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_defect" ADD CONSTRAINT "tb_defect_item_cd_fkey" FOREIGN KEY ("item_cd") REFERENCES "tb_item"("item_cd") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_defect" ADD CONSTRAINT "tb_defect_lot_no_fkey" FOREIGN KEY ("lot_no") REFERENCES "tb_lot"("lot_no") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_defect_dispose" ADD CONSTRAINT "tb_defect_dispose_defect_id_fkey" FOREIGN KEY ("defect_id") REFERENCES "tb_defect"("defect_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_equip_status" ADD CONSTRAINT "tb_equip_status_equip_cd_fkey" FOREIGN KEY ("equip_cd") REFERENCES "tb_equipment"("equip_cd") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_maint_plan" ADD CONSTRAINT "tb_maint_plan_equip_cd_fkey" FOREIGN KEY ("equip_cd") REFERENCES "tb_equipment"("equip_cd") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_maint_result" ADD CONSTRAINT "tb_maint_result_equip_cd_fkey" FOREIGN KEY ("equip_cd") REFERENCES "tb_equipment"("equip_cd") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_maint_result" ADD CONSTRAINT "tb_maint_result_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "tb_worker"("worker_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_inventory" ADD CONSTRAINT "tb_inventory_item_cd_fkey" FOREIGN KEY ("item_cd") REFERENCES "tb_item"("item_cd") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_inventory" ADD CONSTRAINT "tb_inventory_lot_no_fkey" FOREIGN KEY ("lot_no") REFERENCES "tb_lot"("lot_no") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_inventory" ADD CONSTRAINT "tb_inventory_wh_cd_fkey" FOREIGN KEY ("wh_cd") REFERENCES "tb_warehouse"("wh_cd") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_inventory_tx" ADD CONSTRAINT "tb_inventory_tx_item_cd_fkey" FOREIGN KEY ("item_cd") REFERENCES "tb_item"("item_cd") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_inventory_tx" ADD CONSTRAINT "tb_inventory_tx_lot_no_fkey" FOREIGN KEY ("lot_no") REFERENCES "tb_lot"("lot_no") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_inventory_adjust" ADD CONSTRAINT "tb_inventory_adjust_item_cd_fkey" FOREIGN KEY ("item_cd") REFERENCES "tb_item"("item_cd") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_inventory_adjust" ADD CONSTRAINT "tb_inventory_adjust_lot_no_fkey" FOREIGN KEY ("lot_no") REFERENCES "tb_lot"("lot_no") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_shipment" ADD CONSTRAINT "tb_shipment_cust_cd_fkey" FOREIGN KEY ("cust_cd") REFERENCES "tb_customer"("cust_cd") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_shipment_dtl" ADD CONSTRAINT "tb_shipment_dtl_ship_id_fkey" FOREIGN KEY ("ship_id") REFERENCES "tb_shipment"("ship_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_shipment_dtl" ADD CONSTRAINT "tb_shipment_dtl_item_cd_fkey" FOREIGN KEY ("item_cd") REFERENCES "tb_item"("item_cd") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_shipment_dtl" ADD CONSTRAINT "tb_shipment_dtl_lot_no_fkey" FOREIGN KEY ("lot_no") REFERENCES "tb_lot"("lot_no") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_incoming" ADD CONSTRAINT "tb_incoming_cust_cd_fkey" FOREIGN KEY ("cust_cd") REFERENCES "tb_customer"("cust_cd") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_incoming_dtl" ADD CONSTRAINT "tb_incoming_dtl_incoming_id_fkey" FOREIGN KEY ("incoming_id") REFERENCES "tb_incoming"("incoming_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_incoming_dtl" ADD CONSTRAINT "tb_incoming_dtl_item_cd_fkey" FOREIGN KEY ("item_cd") REFERENCES "tb_item"("item_cd") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_incoming_dtl" ADD CONSTRAINT "tb_incoming_dtl_lot_no_fkey" FOREIGN KEY ("lot_no") REFERENCES "tb_lot"("lot_no") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_user" ADD CONSTRAINT "tb_user_role_cd_fkey" FOREIGN KEY ("role_cd") REFERENCES "tb_role"("role_cd") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_user" ADD CONSTRAINT "tb_user_company_cd_fkey" FOREIGN KEY ("company_cd") REFERENCES "tb_company"("company_cd") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_menu" ADD CONSTRAINT "tb_menu_parent_menu_id_fkey" FOREIGN KEY ("parent_menu_id") REFERENCES "tb_menu"("menu_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_role_menu" ADD CONSTRAINT "tb_role_menu_role_cd_fkey" FOREIGN KEY ("role_cd") REFERENCES "tb_role"("role_cd") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_role_menu" ADD CONSTRAINT "tb_role_menu_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "tb_menu"("menu_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_common_code" ADD CONSTRAINT "tb_common_code_group_cd_fkey" FOREIGN KEY ("group_cd") REFERENCES "tb_common_code_grp"("group_cd") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_audit_log" ADD CONSTRAINT "tb_audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "tb_user"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_notification" ADD CONSTRAINT "tb_notification_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "tb_user"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_noti_rule" ADD CONSTRAINT "tb_noti_rule_target_role_cd_fkey" FOREIGN KEY ("target_role_cd") REFERENCES "tb_role"("role_cd") ON DELETE SET NULL ON UPDATE CASCADE;
