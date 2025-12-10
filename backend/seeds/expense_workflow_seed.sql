-- Expense Approval Workflow Seed Data
-- =====================================

-- Use the admin user as organization reference
DO $$
DECLARE
    org_id UUID := '0b6c4f4f-0560-472f-93b6-85996ff0c444';
    admin_user_id UUID := '0b6c4f4f-0560-472f-93b6-85996ff0c444';
    assignor_id UUID;
    referee_id UUID;
    cat_travel UUID;
    cat_equipment UUID;
    cat_meals UUID;
    cat_training UUID;
    pm_reimburse UUID;
    pm_credit UUID;
    pm_po UUID;
    receipt1 UUID;
    receipt2 UUID;
    receipt3 UUID;
    receipt4 UUID;
    receipt5 UUID;
    expense1 UUID;
    expense2 UUID;
    expense3 UUID;
    expense4 UUID;
    expense5 UUID;
BEGIN
    -- Get some user IDs (fallback to admin if not found)
    SELECT id INTO assignor_id FROM users WHERE email = 'assignor@cmba.ca' LIMIT 1;
    SELECT id INTO referee_id FROM users WHERE email = 'senior.ref@cmba.ca' LIMIT 1;

    IF assignor_id IS NULL THEN assignor_id := admin_user_id; END IF;
    IF referee_id IS NULL THEN referee_id := admin_user_id; END IF;

    -- 1. Create Expense Categories
    INSERT INTO expense_categories (id, organization_id, name, code, description, color_code, icon, requires_approval, approval_threshold, reimbursable)
    VALUES
        (gen_random_uuid(), org_id, 'Travel & Mileage', 'TRAVEL', 'Transportation, mileage, parking, tolls', '#3B82F6', 'car', true, 100.00, true),
        (gen_random_uuid(), org_id, 'Equipment & Gear', 'EQUIP', 'Referee equipment, uniforms, whistles', '#10B981', 'briefcase', true, 200.00, true),
        (gen_random_uuid(), org_id, 'Meals & Entertainment', 'MEALS', 'Working meals, team meals', '#F59E0B', 'utensils', true, 50.00, true),
        (gen_random_uuid(), org_id, 'Training & Certification', 'TRAIN', 'Courses, certifications, workshops', '#8B5CF6', 'graduation-cap', true, 500.00, true),
        (gen_random_uuid(), org_id, 'Office Supplies', 'OFFICE', 'Administrative supplies', '#6B7280', 'folder', false, NULL, true)
    ON CONFLICT (organization_id, code) DO NOTHING;

    SELECT id INTO cat_travel FROM expense_categories WHERE code = 'TRAVEL' AND organization_id = org_id;
    SELECT id INTO cat_equipment FROM expense_categories WHERE code = 'EQUIP' AND organization_id = org_id;
    SELECT id INTO cat_meals FROM expense_categories WHERE code = 'MEALS' AND organization_id = org_id;
    SELECT id INTO cat_training FROM expense_categories WHERE code = 'TRAIN' AND organization_id = org_id;

    -- 2. Create Payment Methods
    INSERT INTO payment_methods (id, organization_id, name, type, description, is_active, requires_approval, auto_approval_limit)
    VALUES
        (gen_random_uuid(), org_id, 'Personal Reimbursement', 'person_reimbursement', 'Direct reimbursement to employee', true, true, 100.00),
        (gen_random_uuid(), org_id, 'Company Credit Card', 'credit_card', 'Organization credit card', true, true, 500.00),
        (gen_random_uuid(), org_id, 'Purchase Order', 'purchase_order', 'Pre-approved purchase order', true, false, NULL)
    ON CONFLICT DO NOTHING;

    SELECT id INTO pm_reimburse FROM payment_methods WHERE type = 'person_reimbursement' AND organization_id = org_id LIMIT 1;
    SELECT id INTO pm_credit FROM payment_methods WHERE type = 'credit_card' AND organization_id = org_id LIMIT 1;
    SELECT id INTO pm_po FROM payment_methods WHERE type = 'purchase_order' AND organization_id = org_id LIMIT 1;

    -- 3. Create Expense Receipts
    receipt1 := gen_random_uuid();
    receipt2 := gen_random_uuid();
    receipt3 := gen_random_uuid();
    receipt4 := gen_random_uuid();
    receipt5 := gen_random_uuid();

    INSERT INTO expense_receipts (id, user_id, organization_id, original_filename, file_path, file_type, mime_type, file_size, file_hash, processing_status)
    VALUES
        (receipt1, referee_id, org_id, 'gas_receipt_dec1.jpg', '/uploads/receipts/gas1.jpg', 'image', 'image/jpeg', 245000, 'seed_hash1_' || receipt1, 'processed'),
        (receipt2, referee_id, org_id, 'uniform_invoice.pdf', '/uploads/receipts/uniform.pdf', 'pdf', 'application/pdf', 512000, 'seed_hash2_' || receipt2, 'processed'),
        (receipt3, assignor_id, org_id, 'lunch_meeting.jpg', '/uploads/receipts/lunch.jpg', 'image', 'image/jpeg', 180000, 'seed_hash3_' || receipt3, 'processed'),
        (receipt4, referee_id, org_id, 'certification_fee.pdf', '/uploads/receipts/cert.pdf', 'pdf', 'application/pdf', 320000, 'seed_hash4_' || receipt4, 'processed'),
        (receipt5, assignor_id, org_id, 'parking_dec5.jpg', '/uploads/receipts/parking.jpg', 'image', 'image/jpeg', 150000, 'seed_hash5_' || receipt5, 'processed');

    -- 4. Create Expense Data
    expense1 := gen_random_uuid();
    expense2 := gen_random_uuid();
    expense3 := gen_random_uuid();
    expense4 := gen_random_uuid();
    expense5 := gen_random_uuid();

    INSERT INTO expense_data (id, receipt_id, user_id, organization_id, vendor_name, total_amount, tax_amount, transaction_date, category_id, description, business_purpose, payment_method_id, payment_method_type, payment_status, expense_urgency)
    VALUES
        (expense1, receipt1, referee_id, org_id, 'Shell Gas Station', 85.50, 4.28, CURRENT_DATE - 5, cat_travel, 'Gas for tournament travel', 'Travel to Provincial Championship', pm_reimburse, 'person_reimbursement', 'pending', 'normal'),
        (expense2, receipt2, referee_id, org_id, 'Official Sports', 245.00, 12.25, CURRENT_DATE - 3, cat_equipment, 'New referee uniform set', 'Required uniform upgrade', pm_reimburse, 'person_reimbursement', 'pending', 'high'),
        (expense3, receipt3, assignor_id, org_id, 'Boston Pizza', 67.80, 3.39, CURRENT_DATE - 2, cat_meals, 'Team coordination lunch', 'Monthly assignor meeting', pm_credit, 'credit_card', 'pending', 'low'),
        (expense4, receipt4, referee_id, org_id, 'Basketball Alberta', 450.00, 0.00, CURRENT_DATE - 7, cat_training, 'Level 3 Certification', 'Required certification upgrade', pm_reimburse, 'person_reimbursement', 'pending', 'urgent'),
        (expense5, receipt5, assignor_id, org_id, 'City Parking', 25.00, 1.25, CURRENT_DATE - 1, cat_travel, 'Venue parking', 'Game assignment parking', pm_reimburse, 'person_reimbursement', 'pending', 'normal');

    -- 5. Create Expense Approvals (pending ones for the workflow)
    INSERT INTO expense_approvals (id, expense_data_id, receipt_id, user_id, organization_id, status, approval_sequence, requested_amount, submitted_at)
    VALUES
        (gen_random_uuid(), expense1, receipt1, referee_id, org_id, 'pending', 1, 85.50, CURRENT_TIMESTAMP - INTERVAL '5 days'),
        (gen_random_uuid(), expense2, receipt2, referee_id, org_id, 'pending', 1, 245.00, CURRENT_TIMESTAMP - INTERVAL '3 days'),
        (gen_random_uuid(), expense3, receipt3, assignor_id, org_id, 'pending', 1, 67.80, CURRENT_TIMESTAMP - INTERVAL '2 days'),
        (gen_random_uuid(), expense4, receipt4, referee_id, org_id, 'pending', 1, 450.00, CURRENT_TIMESTAMP - INTERVAL '7 days'),
        (gen_random_uuid(), expense5, receipt5, assignor_id, org_id, 'pending', 1, 25.00, CURRENT_TIMESTAMP - INTERVAL '1 day');

    RAISE NOTICE 'Seed data created successfully!';
END $$;

-- Show summary
SELECT 'Expense Categories' as table_name, COUNT(*) as count FROM expense_categories
UNION ALL
SELECT 'Payment Methods', COUNT(*) FROM payment_methods
UNION ALL
SELECT 'Expense Receipts', COUNT(*) FROM expense_receipts
UNION ALL
SELECT 'Expense Data', COUNT(*) FROM expense_data
UNION ALL
SELECT 'Pending Approvals', COUNT(*) FROM expense_approvals WHERE status = 'pending';
