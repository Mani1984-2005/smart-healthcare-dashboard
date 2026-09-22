-- CreateTable
CREATE TABLE "intake_sessions" (
    "id" UUID NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "encounter_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "language" TEXT,
    "interaction_mode" TEXT,
    "intake_mode" TEXT NOT NULL DEFAULT 'STANDARD',
    "consent_given" BOOLEAN NOT NULL DEFAULT false,
    "consent_captured_at" TIMESTAMPTZ(6),
    "session_token_hash" TEXT,
    "created_by_staff_uid" TEXT,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "intake_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_messages" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "input_mode" TEXT,
    "language" TEXT,
    "question_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intake_answers" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "question_id" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "answer_type" TEXT NOT NULL,
    "raw_value" JSONB NOT NULL,
    "certainty" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "source_message_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intake_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_histories" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "history_json" JSONB NOT NULL,
    "completion_status" TEXT NOT NULL DEFAULT 'INCOMPLETE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "clinical_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "intake_sessions_patient_id_idx" ON "intake_sessions"("patient_id");

-- CreateIndex
CREATE INDEX "intake_sessions_status_idx" ON "intake_sessions"("status");

-- CreateIndex
CREATE INDEX "conversation_messages_session_id_idx" ON "conversation_messages"("session_id");

-- CreateIndex
CREATE INDEX "intake_answers_session_id_idx" ON "intake_answers"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "intake_answers_session_id_question_id_key" ON "intake_answers"("session_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_histories_session_id_key" ON "clinical_histories"("session_id");

-- CreateIndex
CREATE INDEX "clinical_histories_patient_id_idx" ON "clinical_histories"("patient_id");

-- AddForeignKey
ALTER TABLE "intake_sessions" ADD CONSTRAINT "intake_sessions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "intake_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intake_answers" ADD CONSTRAINT "intake_answers_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "intake_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intake_answers" ADD CONSTRAINT "intake_answers_source_message_id_fkey" FOREIGN KEY ("source_message_id") REFERENCES "conversation_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_histories" ADD CONSTRAINT "clinical_histories_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "intake_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_histories" ADD CONSTRAINT "clinical_histories_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
