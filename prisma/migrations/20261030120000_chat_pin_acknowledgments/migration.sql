-- Volunteer acknowledgment of the pinned Announcements chat message

CREATE TABLE "event_chat_pin_acknowledgments" (
  "id" TEXT NOT NULL,
  "message_id" TEXT NOT NULL,
  "volunteer_id" TEXT NOT NULL,
  "acknowledged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "event_chat_pin_acknowledgments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "event_chat_pin_acknowledgments_message_id_volunteer_id_key"
ON "event_chat_pin_acknowledgments"("message_id", "volunteer_id");

CREATE INDEX "event_chat_pin_acknowledgments_volunteer_id_idx"
ON "event_chat_pin_acknowledgments"("volunteer_id");

ALTER TABLE "event_chat_pin_acknowledgments"
ADD CONSTRAINT "event_chat_pin_acknowledgments_message_id_fkey"
FOREIGN KEY ("message_id") REFERENCES "event_chat_messages"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_chat_pin_acknowledgments"
ADD CONSTRAINT "event_chat_pin_acknowledgments_volunteer_id_fkey"
FOREIGN KEY ("volunteer_id") REFERENCES "volunteers"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
