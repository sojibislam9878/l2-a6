ALTER TABLE "bookings"
  ADD CONSTRAINT "chk_bookings_quantity_positive" CHECK ("quantity_kg" > 0),
  ADD CONSTRAINT "chk_bookings_date_order" CHECK ("end_date" >= "start_date"),
  ADD CONSTRAINT "chk_bookings_rate_positive" CHECK ("rate_per_kg_per_day" > 0),
  ADD CONSTRAINT "chk_bookings_estimated_cost_non_negative" CHECK ("estimated_cost" >= 0),
  ADD CONSTRAINT "chk_bookings_final_cost_non_negative" CHECK ("final_cost" IS NULL OR "final_cost" >= 0);

ALTER TABLE "chambers"
  ADD CONSTRAINT "chk_chambers_capacity_positive" CHECK ("capacity_kg" > 0),
  ADD CONSTRAINT "chk_chambers_temp_order" CHECK ("max_temp_c" >= "min_temp_c");

ALTER TABLE "crop_types"
  ADD CONSTRAINT "chk_crop_types_temp_order" CHECK ("ideal_max_temp_c" >= "ideal_min_temp_c"),
  ADD CONSTRAINT "chk_crop_types_storage_days_positive" CHECK ("max_storage_days" > 0);

ALTER TABLE "warehouses"
  ADD CONSTRAINT "chk_warehouses_rate_positive" CHECK ("rate_per_kg_per_day" > 0),
  ADD CONSTRAINT "chk_warehouses_min_booking_days_positive" CHECK ("min_booking_days" > 0),
  ADD CONSTRAINT "chk_warehouses_review_count_non_negative" CHECK ("review_count" >= 0),
  ADD CONSTRAINT "chk_warehouses_avg_rating_range" CHECK ("avg_rating" IS NULL OR ("avg_rating" >= 1 AND "avg_rating" <= 5));

ALTER TABLE "reviews"
  ADD CONSTRAINT "chk_reviews_rating_range" CHECK ("rating" >= 1 AND "rating" <= 5);

ALTER TABLE "payments"
  ADD CONSTRAINT "chk_payments_amount_non_negative" CHECK ("amount" >= 0),
  ADD CONSTRAINT "chk_payments_amount_bdt_non_negative" CHECK ("amount_bdt" >= 0),
  ADD CONSTRAINT "chk_payments_fx_rate_positive" CHECK ("fx_rate" > 0);

ALTER TABLE "inspections"
  ADD CONSTRAINT "chk_inspections_qty_positive" CHECK ("actual_qty_kg" > 0),
  ADD CONSTRAINT "chk_inspections_moisture_range" CHECK ("moisture_pct" IS NULL OR ("moisture_pct" >= 0 AND "moisture_pct" <= 100));

ALTER TABLE "farmer_profiles"
  ADD CONSTRAINT "chk_farmer_profiles_farm_size_positive" CHECK ("farm_size_acre" IS NULL OR "farm_size_acre" > 0);
