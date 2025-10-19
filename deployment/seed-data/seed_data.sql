--
-- PostgreSQL database dump
--

\restrict baskJE5H1LxnDxl1fdAMVgwsFTrCu3DCgu3cD6wG600iqVsWDi0bfRjmNdjR5Kc

-- Dumped from database version 15.14
-- Dumped by pg_dump version 15.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: referee_levels; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.referee_levels VALUES ('e472bfc9-d938-4e33-bf3e-496755b1d5e0', 'Rookie', 25.00, 'New referees learning the basics. Always displays white whistle.', '["Recreational","Youth"]', '{"min_years":0,"max_years":1,"requires_mentor":true}', '{"max_game_level":"Recreational","requires_supervision":true,"white_whistle_required":true}', '2025-10-19 18:05:50.305204+00', '2025-10-19 18:05:50.305204+00');
INSERT INTO public.referee_levels VALUES ('82056795-fc13-4e80-a189-d1fc2f9988ff', 'Junior', 35.00, 'Developing referees with some experience. May display white whistle based on individual flag.', '["Recreational","Youth","Competitive"]', '{"min_years":1,"max_years":3,"requires_mentor":false}', '{"max_game_level":"Competitive","requires_supervision":false,"white_whistle_conditional":true}', '2025-10-19 18:05:50.305204+00', '2025-10-19 18:05:50.305204+00');
INSERT INTO public.referee_levels VALUES ('4e2258a5-b117-4df2-a964-64fffec8cd8e', 'Senior', 50.00, 'Experienced referees capable of handling all game types. Never displays white whistle.', '["Recreational","Youth","Competitive","Elite"]', '{"min_years":3,"max_years":null,"requires_mentor":false}', '{"max_game_level":"Elite","requires_supervision":false,"white_whistle_never":true}', '2025-10-19 18:05:50.305204+00', '2025-10-19 18:05:50.305204+00');


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.roles VALUES ('7ac7ab11-350b-4404-aa1b-923b9a6b1738', 'Admin', 'Administrative access to most system functions. Cannot manage roles or impersonate users.', true, true, '2025-10-19 18:06:24.820438+00', '2025-10-19 18:06:24.820438+00', 'system', NULL, '#EA580C', 'ADMIN');
INSERT INTO public.roles VALUES ('961c280d-b0c5-421f-b63b-58a7e1c26b14', 'Assignment Manager', 'Manages game assignments and referee scheduling. Can assign referees to games.', true, true, '2025-10-19 18:06:24.822253+00', '2025-10-19 18:06:24.822253+00', 'operational', NULL, '#F59E0B', 'ASSIGNMENT_MANAGER');
INSERT INTO public.roles VALUES ('ab992b5f-d5be-46bd-a0f6-fdcb9b1e173e', 'Referee Coordinator', 'Coordinates referee activities, evaluations, and development. Manages referee information.', true, true, '2025-10-19 18:06:24.82382+00', '2025-10-19 18:06:24.82382+00', 'operational', NULL, '#10B981', 'REFEREE_COORDINATOR');
INSERT INTO public.roles VALUES ('ba818921-487e-4969-acd1-e79a5b463df9', 'Super Admin', 'Full system access with all permissions. Can manage other admins and system settings.', true, true, '2025-10-19 18:06:24.817421+00', '2025-10-19 18:06:24.817421+00', 'system', NULL, '#DC2626', 'SUPER_ADMIN');
INSERT INTO public.roles VALUES ('26913c2d-5a95-48ef-868a-03e68809e3ce', 'Senior Referee', 'Experienced referee with additional privileges. Can evaluate other referees.', true, true, '2025-10-19 18:06:24.825426+00', '2025-10-19 18:06:24.825426+00', 'referee_type', '{"level": "Senior", "can_evaluate": true, "min_experience_years": 5}', '#3B82F6', 'SENIOR_REFEREE');
INSERT INTO public.roles VALUES ('b0072d8c-e230-4f07-9b9f-98d11a3c63b0', 'Junior Referee', 'Basic referee role with access to assignments and personal information.', true, true, '2025-10-19 18:06:24.827223+00', '2025-10-19 18:06:24.827223+00', 'referee_type', '{"level": "Junior", "can_evaluate": false}', '#6366F1', 'JUNIOR_REFEREE');
INSERT INTO public.roles VALUES ('add4b5fe-f476-46d4-a4ce-81bce4cfb40c', 'Assignor', 'Can assign referees to games and manage game schedules.', true, true, '2025-10-19 18:06:24.829208+00', '2025-10-19 18:06:24.829208+00', 'operational', NULL, '#8B5CF6', 'ASSIGNOR');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.users VALUES ('4d24665b-c051-408c-94ba-e1310f1ee12a', 'admin@sportsmanager.com', '$2a$10$b8fRTlSCrTSJ2omzV1t1iuNCqtDk14twu4bEYCVYGlN83RJtjuGwC', '2025-10-19 18:06:24.947917+00', '2025-10-19 18:06:24.947917+00', 'Super Admin User', '+1 (403) 555-0001', NULL, 'T2P 1A1', 25, true, NULL, NULL, NULL, 0, NULL, NULL, '{}', false, NULL, NULL, NULL, NULL, NULL, 'Calgary', 'AB', NULL, 'Canada', NULL, NULL, NULL, NULL, NULL, 'active', '1', '2025-10-19', NULL, 0, NULL, NULL, NULL, NULL, false);
INSERT INTO public.users VALUES ('d9149bb0-bbe1-485d-95e4-a3e69bfc88d1', 'admin@cmba.ca', '$2a$10$./7XEoS/YSHLxZ7VsSrDxuvNw9lF40WIC2m.JesFAU9IPEWg3PWXK', '2025-10-19 18:06:25.048029+00', '2025-10-19 18:06:25.048029+00', 'Admin User', '+1 (403) 555-0002', NULL, 'T2N 2B2', 25, true, NULL, NULL, NULL, 0, NULL, NULL, '{}', false, NULL, NULL, NULL, NULL, NULL, 'Calgary', 'AB', NULL, 'Canada', NULL, NULL, NULL, NULL, NULL, 'active', '1', '2025-10-19', NULL, 0, NULL, NULL, NULL, NULL, false);
INSERT INTO public.users VALUES ('cc99df77-83fa-4bfb-ab2b-9a1b999e9134', 'assignor@cmba.ca', '$2a$10$YGncqS0kzM4wiur6Aa0pyuwTh2Z/Qn66.v96AdZLdZPYBzYbix0aO', '2025-10-19 18:06:25.138545+00', '2025-10-19 18:06:25.138545+00', 'Assignment Manager', '+1 (403) 555-0003', NULL, 'T2E 3C3', 25, true, NULL, NULL, NULL, 0, NULL, NULL, '{}', false, NULL, NULL, NULL, NULL, NULL, 'Calgary', 'AB', NULL, 'Canada', NULL, NULL, NULL, NULL, NULL, 'active', '1', '2025-10-19', NULL, 0, NULL, NULL, NULL, NULL, false);
INSERT INTO public.users VALUES ('e89ec126-eb96-4ffd-b38b-8890f839465d', 'coordinator@cmba.ca', '$2a$10$x3XuhX9Am1ud0uRaqZzgkebZ8ixn1CNQyvBMWs00vFOaks2O6i8qy', '2025-10-19 18:06:25.228847+00', '2025-10-19 18:06:25.228847+00', 'Referee Coordinator', '+1 (403) 555-0004', NULL, 'T2W 4D4', 25, true, NULL, NULL, NULL, 0, NULL, NULL, '{}', false, NULL, NULL, NULL, NULL, NULL, 'Calgary', 'AB', NULL, 'Canada', NULL, NULL, NULL, NULL, NULL, 'active', '1', '2025-10-19', NULL, 0, NULL, NULL, NULL, NULL, false);
INSERT INTO public.users VALUES ('a7d4ba2d-9a83-4674-8040-c8d03fba7fc2', 'senior.ref@cmba.ca', '$2a$10$0IgW6HLxKmkNdyoob.1eSuBM0YK2EnwewxtdM5TYfDeq9U8IjbKNO', '2025-10-19 18:06:25.319511+00', '2025-10-19 18:06:25.319511+00', 'Senior Referee', '+1 (403) 555-0005', NULL, 'T2A 5E5', 30, true, 45.00, NULL, 7, 0, NULL, NULL, '{}', false, NULL, NULL, NULL, NULL, NULL, 'Calgary', 'AB', NULL, 'Canada', NULL, NULL, NULL, NULL, NULL, 'active', '1', '2025-10-19', NULL, 0, NULL, NULL, NULL, NULL, true);
INSERT INTO public.users VALUES ('192eb7c8-37dd-4d73-af47-72b866cbc7da', 'referee@test.com', '$2a$10$Y1gq7C3QW2xPWLqoZ7F2xu6Rs7ImkzN3y.ca/A4O5WT2/5ZVG5QN.', '2025-10-19 18:06:25.421251+00', '2025-10-19 18:06:25.421251+00', 'Junior Referee', '+1 (403) 555-0006', NULL, 'T2J 6F6', 25, true, 35.00, NULL, 3, 0, NULL, NULL, '{}', false, NULL, NULL, NULL, NULL, NULL, 'Calgary', 'AB', NULL, 'Canada', NULL, NULL, NULL, NULL, NULL, 'active', '1', '2025-10-19', NULL, 0, NULL, NULL, NULL, NULL, true);


--
-- Data for Name: access_control_audit; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: accounting_integrations; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: accounting_sync_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: ai_assignment_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: ai_assignment_partner_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: ai_assignment_rule_runs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: expense_receipts; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: ai_processing_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.organizations VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'default', NULL, NULL, '{"is_default":true}', true, '2025-10-19 18:05:50.305204+00', '2025-10-19 18:05:50.305204+00', NULL);


--
-- Data for Name: leagues; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.leagues VALUES ('d8bebe39-e35d-4ced-a457-4450b72f7785', 'CMBA', 'U18', 'Boys', 'Division 1', '2024-25', 'Competitive', '2025-10-19 18:06:25.441537+00', '2025-10-19 18:06:25.441537+00', NULL);
INSERT INTO public.leagues VALUES ('65291479-8c3f-48c3-a388-b4685600f6b7', 'CMBA', 'U18', 'Girls', 'Division 1', '2024-25', 'Competitive', '2025-10-19 18:06:25.441537+00', '2025-10-19 18:06:25.441537+00', NULL);
INSERT INTO public.leagues VALUES ('63e33115-0684-45ab-bee8-34621778b1fc', 'CMBA', 'U16', 'Boys', 'Division 1', '2024-25', 'Competitive', '2025-10-19 18:06:25.441537+00', '2025-10-19 18:06:25.441537+00', NULL);
INSERT INTO public.leagues VALUES ('d8c6bb62-613a-4098-9461-73817bf5d54d', 'CMBA', 'U16', 'Girls', 'Division 1', '2024-25', 'Recreational', '2025-10-19 18:06:25.441537+00', '2025-10-19 18:06:25.441537+00', NULL);
INSERT INTO public.leagues VALUES ('0bf1247d-e0c0-44a3-a756-3066a966a25c', 'CMBA', 'U14', 'Boys', 'Division 1', '2024-25', 'Recreational', '2025-10-19 18:06:25.441537+00', '2025-10-19 18:06:25.441537+00', NULL);
INSERT INTO public.leagues VALUES ('c3244cb2-439b-437c-b13b-80a7220439ef', 'CMBA', 'U14', 'Girls', 'Division 1', '2024-25', 'Recreational', '2025-10-19 18:06:25.441537+00', '2025-10-19 18:06:25.441537+00', NULL);


--
-- Data for Name: locations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.locations VALUES ('43198825-483c-4a15-a8ba-2d5a962a2802', 'Genesis Centre', '7555 Falconridge Blvd NE', 'Calgary', 'AB', 'T3J 0C9', 'Canada', 51.09920000, -113.96190000, 500, 'Genesis Centre Front Desk', '403-974-4100', 'genesis@calgary.ca', NULL, 300, '{"arenas":2,"dressing_rooms":8,"concession":true,"pro_shop":false}', '{"wheelchair_accessible":true,"accessible_parking":true,"elevator":true}', 'Premier facility with two ice surfaces', true, '2025-10-19 18:06:25.430188+00', '2025-10-19 18:06:25.430188+00', 150.00, 200.00, NULL);
INSERT INTO public.locations VALUES ('1718bb8f-1488-4c3f-87f7-04d5faadc6de', 'Repsol Sport Centre', '2225 Macleod Trail SE', 'Calgary', 'AB', 'T2G 5B6', 'Canada', 51.02990000, -114.06280000, 800, 'Repsol Reception', '403-233-8393', 'repsol@calgary.ca', NULL, 400, '{"arenas":2,"dressing_rooms":10,"concession":true,"pro_shop":true}', '{"wheelchair_accessible":true,"accessible_parking":true,"elevator":true}', 'Large multi-purpose sports facility', true, '2025-10-19 18:06:25.430188+00', '2025-10-19 18:06:25.430188+00', 180.00, 250.00, NULL);
INSERT INTO public.locations VALUES ('0b36fb4b-01c8-4348-b9cb-9873ad6b1e01', 'MNP Community Centre', '151 Saddletowne Circle NE', 'Calgary', 'AB', 'T3J 0L4', 'Canada', 51.12470000, -113.96610000, 400, 'MNP Front Desk', '403-974-4300', 'mnp@calgary.ca', NULL, 250, '{"arenas":1,"dressing_rooms":6,"concession":true,"pro_shop":false}', '{"wheelchair_accessible":true,"accessible_parking":true,"elevator":true}', 'Community recreation facility', true, '2025-10-19 18:06:25.430188+00', '2025-10-19 18:06:25.430188+00', 140.00, 180.00, NULL);
INSERT INTO public.locations VALUES ('50592c2e-6fb2-4afd-95e1-09854e05ec9c', 'Westside Recreation Centre', '2000 69 St SW', 'Calgary', 'AB', 'T3E 5M7', 'Canada', 50.99610000, -114.13860000, 300, 'Westside Reception', '403-246-9600', 'westside@calgary.ca', NULL, 200, '{"arenas":1,"dressing_rooms":4,"concession":true,"pro_shop":false}', '{"wheelchair_accessible":true,"accessible_parking":true,"elevator":false}', 'Smaller community facility', true, '2025-10-19 18:06:25.430188+00', '2025-10-19 18:06:25.430188+00', 130.00, 170.00, NULL);
INSERT INTO public.locations VALUES ('8d8961ca-0e8d-4084-9e51-eaea13e84897', 'Cardel Rec South', '333 Shawville Blvd SE', 'Calgary', 'AB', 'T2Y 4H3', 'Canada', 50.89690000, -113.95780000, 600, 'Cardel South Front Desk', '403-278-7542', 'cardelsouth@calgary.ca', NULL, 350, '{"arenas":2,"dressing_rooms":8,"concession":true,"pro_shop":true}', '{"wheelchair_accessible":true,"accessible_parking":true,"elevator":true}', 'Modern facility in south Calgary', true, '2025-10-19 18:06:25.430188+00', '2025-10-19 18:06:25.430188+00', 160.00, 210.00, NULL);
INSERT INTO public.locations VALUES ('ae9ed115-af59-4674-9408-fa37891d70f3', 'Vivo Recreation Centre', '11950 Country Village Link NE', 'Calgary', 'AB', 'T3K 6E3', 'Canada', 51.17530000, -114.04360000, 450, 'Vivo Reception', '403-290-0086', 'vivo@calgary.ca', NULL, 300, '{"arenas":1,"dressing_rooms":6,"concession":true,"pro_shop":false}', '{"wheelchair_accessible":true,"accessible_parking":true,"elevator":true}', 'North Calgary recreation facility', true, '2025-10-19 18:06:25.430188+00', '2025-10-19 18:06:25.430188+00', 155.00, 195.00, NULL);
INSERT INTO public.locations VALUES ('ced6a884-d8ce-4811-9a55-09d58b642e47', 'Shouldice Athletic Park', '2225 18 St NW', 'Calgary', 'AB', 'T2M 3T8', 'Canada', 51.06690000, -114.09360000, 350, 'Shouldice Park Office', '403-221-3690', 'shouldice@calgary.ca', NULL, 150, '{"arenas":1,"dressing_rooms":4,"concession":false,"pro_shop":false}', '{"wheelchair_accessible":true,"accessible_parking":true,"elevator":false}', 'Community athletic park', true, '2025-10-19 18:06:25.430188+00', '2025-10-19 18:06:25.430188+00', 125.00, 160.00, NULL);
INSERT INTO public.locations VALUES ('14afb8cc-89a3-4334-bde7-e262989f7dba', 'Airdrie Recreation Centre', '800 East Lake Blvd NE', 'Airdrie', 'AB', 'T4A 2K5', 'Canada', 51.29860000, -113.98940000, 400, 'Airdrie Rec Front Desk', '403-948-8804', 'recreation@airdrie.ca', NULL, 250, '{"arenas":1,"dressing_rooms":6,"concession":true,"pro_shop":false}', '{"wheelchair_accessible":true,"accessible_parking":true,"elevator":true}', 'Main recreation facility in Airdrie', true, '2025-10-19 18:06:25.430188+00', '2025-10-19 18:06:25.430188+00', 120.00, 150.00, NULL);
INSERT INTO public.locations VALUES ('e3aaf7ac-d130-4e30-886d-7f38c9e0b226', 'Okotoks Recreation Centre', '1 Recreation Dr', 'Okotoks', 'AB', 'T1S 1C9', 'Canada', 50.72750000, -113.97470000, 350, 'Okotoks Rec Reception', '403-938-7333', 'recreation@okotoks.ca', NULL, 200, '{"arenas":1,"dressing_rooms":4,"concession":true,"pro_shop":false}', '{"wheelchair_accessible":true,"accessible_parking":true,"elevator":false}', 'Okotoks community facility', true, '2025-10-19 18:06:25.430188+00', '2025-10-19 18:06:25.430188+00', 115.00, 145.00, NULL);
INSERT INTO public.locations VALUES ('5d00c123-2602-4555-bbdd-4c0c90e3bd4e', 'Cochrane Spray Lake Sawmills Arena', '203 1 St W', 'Cochrane', 'AB', 'T4C 1A7', 'Canada', 51.18860000, -114.46860000, 300, 'Cochrane Arena Office', '403-851-2510', 'arena@cochrane.ca', NULL, 150, '{"arenas":1,"dressing_rooms":4,"concession":true,"pro_shop":false}', '{"wheelchair_accessible":true,"accessible_parking":true,"elevator":false}', 'Cochrane arena facility', true, '2025-10-19 18:06:25.430188+00', '2025-10-19 18:06:25.430188+00', 110.00, 140.00, NULL);


--
-- Data for Name: teams; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.teams VALUES ('c1ba96ce-e3b4-4f87-b2df-4a53e26617b7', 'Calgary North Warriors', 'Calgary North', 'team1@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', 'd8bebe39-e35d-4ced-a457-4450b72f7785', 1, NULL);
INSERT INTO public.teams VALUES ('bf76daad-0ad4-4219-b721-adfddf3fa746', 'Calgary South Eagles', 'Calgary South', 'team2@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', 'd8bebe39-e35d-4ced-a457-4450b72f7785', 2, NULL);
INSERT INTO public.teams VALUES ('bebee5a1-e4b3-4cf5-8b7b-f21115d8fd99', 'Calgary East Thunder', 'Calgary East', 'team3@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', 'd8bebe39-e35d-4ced-a457-4450b72f7785', 3, NULL);
INSERT INTO public.teams VALUES ('43c82ab9-3681-464e-85ab-278200a8468c', 'Calgary West Storm', 'Calgary West', 'team4@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', 'd8bebe39-e35d-4ced-a457-4450b72f7785', 4, NULL);
INSERT INTO public.teams VALUES ('91f50d6e-9cd9-47d5-8ffc-f6117ea9b6bf', 'Airdrie Knights', 'Airdrie', 'team5@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', 'd8bebe39-e35d-4ced-a457-4450b72f7785', 5, NULL);
INSERT INTO public.teams VALUES ('45b27748-f398-49b7-a989-cb82ae648936', 'Okotoks Titans', 'Okotoks', 'team6@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', 'd8bebe39-e35d-4ced-a457-4450b72f7785', 6, NULL);
INSERT INTO public.teams VALUES ('152354a0-b8e5-4792-8055-4e425ec713e3', 'Calgary North Warriors', 'Calgary North', 'team1@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', '65291479-8c3f-48c3-a388-b4685600f6b7', 1, NULL);
INSERT INTO public.teams VALUES ('a96e366c-8729-4fe1-8577-29583dc88cc3', 'Calgary South Eagles', 'Calgary South', 'team2@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', '65291479-8c3f-48c3-a388-b4685600f6b7', 2, NULL);
INSERT INTO public.teams VALUES ('03744f1e-dd97-4fa0-b015-7293e481d906', 'Calgary East Thunder', 'Calgary East', 'team3@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', '65291479-8c3f-48c3-a388-b4685600f6b7', 3, NULL);
INSERT INTO public.teams VALUES ('2a3796c2-9fe2-415f-8772-35482c20edb7', 'Calgary West Storm', 'Calgary West', 'team4@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', '65291479-8c3f-48c3-a388-b4685600f6b7', 4, NULL);
INSERT INTO public.teams VALUES ('212afa89-f352-4419-b1b8-1e635ab8ad6c', 'Airdrie Knights', 'Airdrie', 'team5@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', '65291479-8c3f-48c3-a388-b4685600f6b7', 5, NULL);
INSERT INTO public.teams VALUES ('01f4be80-7a2b-4d64-81ae-ec84abb6d0f9', 'Okotoks Titans', 'Okotoks', 'team6@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', '65291479-8c3f-48c3-a388-b4685600f6b7', 6, NULL);
INSERT INTO public.teams VALUES ('bca33ae6-160d-4b43-9467-135b7ed9bc39', 'Calgary North Warriors', 'Calgary North', 'team1@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', '63e33115-0684-45ab-bee8-34621778b1fc', 1, NULL);
INSERT INTO public.teams VALUES ('5fa4bfca-a15c-4242-b07f-9196777731f6', 'Calgary South Eagles', 'Calgary South', 'team2@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', '63e33115-0684-45ab-bee8-34621778b1fc', 2, NULL);
INSERT INTO public.teams VALUES ('e3f4aab3-bb8e-4ba0-a34e-87b9fadfe9f4', 'Calgary East Thunder', 'Calgary East', 'team3@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', '63e33115-0684-45ab-bee8-34621778b1fc', 3, NULL);
INSERT INTO public.teams VALUES ('538515a7-1c3d-4701-aaff-b4498bf16682', 'Calgary West Storm', 'Calgary West', 'team4@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', '63e33115-0684-45ab-bee8-34621778b1fc', 4, NULL);
INSERT INTO public.teams VALUES ('4453c3f3-7ae0-4b82-9f02-4b043aa8eb6b', 'Airdrie Knights', 'Airdrie', 'team5@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', '63e33115-0684-45ab-bee8-34621778b1fc', 5, NULL);
INSERT INTO public.teams VALUES ('1eea174f-19d2-43bd-b0c8-9eb42b4e0305', 'Okotoks Titans', 'Okotoks', 'team6@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', '63e33115-0684-45ab-bee8-34621778b1fc', 6, NULL);
INSERT INTO public.teams VALUES ('00acc96e-d4ea-4329-8844-3225c6469f29', 'Calgary North Warriors', 'Calgary North', 'team1@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', 'd8c6bb62-613a-4098-9461-73817bf5d54d', 1, NULL);
INSERT INTO public.teams VALUES ('65bb63c1-2b15-45d7-8eee-058f3da7496c', 'Calgary South Eagles', 'Calgary South', 'team2@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', 'd8c6bb62-613a-4098-9461-73817bf5d54d', 2, NULL);
INSERT INTO public.teams VALUES ('1d770bba-da30-4752-ad3b-6232a069646e', 'Calgary East Thunder', 'Calgary East', 'team3@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', 'd8c6bb62-613a-4098-9461-73817bf5d54d', 3, NULL);
INSERT INTO public.teams VALUES ('c16f608d-ca67-4aef-b270-e080ed42daf4', 'Calgary West Storm', 'Calgary West', 'team4@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', 'd8c6bb62-613a-4098-9461-73817bf5d54d', 4, NULL);
INSERT INTO public.teams VALUES ('7c8d6e59-8685-4102-958e-56648b5bb740', 'Airdrie Knights', 'Airdrie', 'team5@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', 'd8c6bb62-613a-4098-9461-73817bf5d54d', 5, NULL);
INSERT INTO public.teams VALUES ('3f1a0e79-c8d5-4840-9587-1df7a090d512', 'Okotoks Titans', 'Okotoks', 'team6@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', 'd8c6bb62-613a-4098-9461-73817bf5d54d', 6, NULL);
INSERT INTO public.teams VALUES ('caad1a83-a043-4225-a054-3a976190b2bd', 'Calgary North Warriors', 'Calgary North', 'team1@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', '0bf1247d-e0c0-44a3-a756-3066a966a25c', 1, NULL);
INSERT INTO public.teams VALUES ('ed60175e-61b5-4633-9016-f0cf56de433e', 'Calgary South Eagles', 'Calgary South', 'team2@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', '0bf1247d-e0c0-44a3-a756-3066a966a25c', 2, NULL);
INSERT INTO public.teams VALUES ('d6675d34-bb2e-480a-b789-acaa776b13f7', 'Calgary East Thunder', 'Calgary East', 'team3@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', '0bf1247d-e0c0-44a3-a756-3066a966a25c', 3, NULL);
INSERT INTO public.teams VALUES ('db512cb4-53a6-4e52-815e-a811bbaa7751', 'Calgary West Storm', 'Calgary West', 'team4@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', '0bf1247d-e0c0-44a3-a756-3066a966a25c', 4, NULL);
INSERT INTO public.teams VALUES ('0152c01b-766d-42fa-ada2-0f433627c26b', 'Airdrie Knights', 'Airdrie', 'team5@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', '0bf1247d-e0c0-44a3-a756-3066a966a25c', 5, NULL);
INSERT INTO public.teams VALUES ('9fb50890-0032-4049-80b7-8c02970f7387', 'Okotoks Titans', 'Okotoks', 'team6@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', '0bf1247d-e0c0-44a3-a756-3066a966a25c', 6, NULL);
INSERT INTO public.teams VALUES ('81be27e8-f5c7-4a70-96b6-e0d8ce04e04e', 'Calgary North Warriors', 'Calgary North', 'team1@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', 'c3244cb2-439b-437c-b13b-80a7220439ef', 1, NULL);
INSERT INTO public.teams VALUES ('bce14902-184d-4444-86c4-f71ce6d7fc7a', 'Calgary South Eagles', 'Calgary South', 'team2@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', 'c3244cb2-439b-437c-b13b-80a7220439ef', 2, NULL);
INSERT INTO public.teams VALUES ('d59c5e51-98e6-4a3c-acc8-75941de283b6', 'Calgary East Thunder', 'Calgary East', 'team3@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', 'c3244cb2-439b-437c-b13b-80a7220439ef', 3, NULL);
INSERT INTO public.teams VALUES ('7768ddd9-a3e0-423b-9f06-2513d1cd5d9f', 'Calgary West Storm', 'Calgary West', 'team4@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', 'c3244cb2-439b-437c-b13b-80a7220439ef', 4, NULL);
INSERT INTO public.teams VALUES ('1c0553cd-4cc5-4300-859c-6f764454388c', 'Airdrie Knights', 'Airdrie', 'team5@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', 'c3244cb2-439b-437c-b13b-80a7220439ef', 5, NULL);
INSERT INTO public.teams VALUES ('69fbccbb-23f0-4c64-98fd-0f9f8f89b3a6', 'Okotoks Titans', 'Okotoks', 'team6@cmba.ca', '403-555-0100', '2025-10-19 18:06:25.444506+00', '2025-10-19 18:06:25.444506+00', 'c3244cb2-439b-437c-b13b-80a7220439ef', 6, NULL);


--
-- Data for Name: games; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.games VALUES ('7796c889-d1a5-4366-a853-67d741ed5ff5', '2025-02-03', '19:30:00', 'Repsol Sport Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, 'c1ba96ce-e3b4-4f87-b2df-4a53e26617b7', 'bf76daad-0ad4-4219-b721-adfddf3fa746', 'd8bebe39-e35d-4ced-a457-4450b72f7785', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('c75945ac-2578-4c28-a080-f5ae0b0d9035', '2025-02-05', '18:00:00', 'MNP Community Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, 'bf76daad-0ad4-4219-b721-adfddf3fa746', 'c1ba96ce-e3b4-4f87-b2df-4a53e26617b7', 'd8bebe39-e35d-4ced-a457-4450b72f7785', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('5feaf6a2-668e-40f6-bff0-b80fb5d3d5a6', '2025-02-07', '19:30:00', 'Westside Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, 'c1ba96ce-e3b4-4f87-b2df-4a53e26617b7', 'bebee5a1-e4b3-4cf5-8b7b-f21115d8fd99', 'd8bebe39-e35d-4ced-a457-4450b72f7785', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('ebed04f4-d080-47ae-901a-6dfb9b2813f3', '2025-02-09', '18:00:00', 'Cardel Rec South', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, 'bebee5a1-e4b3-4cf5-8b7b-f21115d8fd99', 'c1ba96ce-e3b4-4f87-b2df-4a53e26617b7', 'd8bebe39-e35d-4ced-a457-4450b72f7785', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('f1fd1f1d-58af-4c39-a193-45dc8156c87d', '2025-02-11', '19:30:00', 'Vivo Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, 'c1ba96ce-e3b4-4f87-b2df-4a53e26617b7', '43c82ab9-3681-464e-85ab-278200a8468c', 'd8bebe39-e35d-4ced-a457-4450b72f7785', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('3907f9b7-a0c1-4f4f-a9a5-6689c301a3d6', '2025-02-13', '18:00:00', 'Genesis Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, '43c82ab9-3681-464e-85ab-278200a8468c', 'c1ba96ce-e3b4-4f87-b2df-4a53e26617b7', 'd8bebe39-e35d-4ced-a457-4450b72f7785', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('5c2a729f-d247-49b4-869d-ba95dd44b08b', '2025-02-15', '19:30:00', 'Repsol Sport Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, 'c1ba96ce-e3b4-4f87-b2df-4a53e26617b7', '91f50d6e-9cd9-47d5-8ffc-f6117ea9b6bf', 'd8bebe39-e35d-4ced-a457-4450b72f7785', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('3bb27d41-6a2c-4b82-981f-d4bbbf217f6a', '2025-02-17', '18:00:00', 'MNP Community Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, '91f50d6e-9cd9-47d5-8ffc-f6117ea9b6bf', 'c1ba96ce-e3b4-4f87-b2df-4a53e26617b7', 'd8bebe39-e35d-4ced-a457-4450b72f7785', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('7a2ac67e-4e62-411b-8986-2d6304fdcd73', '2025-02-19', '19:30:00', 'Westside Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, 'c1ba96ce-e3b4-4f87-b2df-4a53e26617b7', '45b27748-f398-49b7-a989-cb82ae648936', 'd8bebe39-e35d-4ced-a457-4450b72f7785', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('42f7c18e-20c3-41cb-bbdd-18724dbd73c4', '2025-02-21', '18:00:00', 'Cardel Rec South', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, '45b27748-f398-49b7-a989-cb82ae648936', 'c1ba96ce-e3b4-4f87-b2df-4a53e26617b7', 'd8bebe39-e35d-4ced-a457-4450b72f7785', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('ab489a21-3cb1-4a2e-b51e-86727d4b79c2', '2025-02-23', '19:30:00', 'Vivo Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, 'bf76daad-0ad4-4219-b721-adfddf3fa746', 'bebee5a1-e4b3-4cf5-8b7b-f21115d8fd99', 'd8bebe39-e35d-4ced-a457-4450b72f7785', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('648d944a-65f1-4f12-9074-df0ee8ee5d13', '2025-02-25', '18:00:00', 'Genesis Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, 'bebee5a1-e4b3-4cf5-8b7b-f21115d8fd99', 'bf76daad-0ad4-4219-b721-adfddf3fa746', 'd8bebe39-e35d-4ced-a457-4450b72f7785', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('bfceb55a-4cef-42a3-8eb1-e607179ece35', '2025-02-27', '19:30:00', 'Repsol Sport Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, 'bf76daad-0ad4-4219-b721-adfddf3fa746', '43c82ab9-3681-464e-85ab-278200a8468c', 'd8bebe39-e35d-4ced-a457-4450b72f7785', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('e48a8205-5249-4524-9060-a822d591947b', '2025-03-01', '18:00:00', 'MNP Community Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, '43c82ab9-3681-464e-85ab-278200a8468c', 'bf76daad-0ad4-4219-b721-adfddf3fa746', 'd8bebe39-e35d-4ced-a457-4450b72f7785', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('5e581b91-cb45-4cfd-aae8-3e90a3069b3e', '2025-03-03', '19:30:00', 'Westside Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, 'bf76daad-0ad4-4219-b721-adfddf3fa746', '91f50d6e-9cd9-47d5-8ffc-f6117ea9b6bf', 'd8bebe39-e35d-4ced-a457-4450b72f7785', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('6e7c26c6-098a-47d7-8748-f0c19e8b181f', '2025-03-05', '18:00:00', 'Cardel Rec South', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, '91f50d6e-9cd9-47d5-8ffc-f6117ea9b6bf', 'bf76daad-0ad4-4219-b721-adfddf3fa746', 'd8bebe39-e35d-4ced-a457-4450b72f7785', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('74a68e10-b12d-479e-96c0-99227c8892c9', '2025-03-07', '19:30:00', 'Vivo Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, 'bf76daad-0ad4-4219-b721-adfddf3fa746', '45b27748-f398-49b7-a989-cb82ae648936', 'd8bebe39-e35d-4ced-a457-4450b72f7785', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('685fcd96-901b-44b4-8ebd-22f113820f8d', '2025-03-09', '18:00:00', 'Genesis Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, '45b27748-f398-49b7-a989-cb82ae648936', 'bf76daad-0ad4-4219-b721-adfddf3fa746', 'd8bebe39-e35d-4ced-a457-4450b72f7785', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('7a914f3a-6d7c-44b6-9cff-a5d29b541db3', '2025-03-11', '19:30:00', 'Repsol Sport Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, 'bebee5a1-e4b3-4cf5-8b7b-f21115d8fd99', '43c82ab9-3681-464e-85ab-278200a8468c', 'd8bebe39-e35d-4ced-a457-4450b72f7785', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('dade9ee8-b13b-41b4-bcf0-72cb984b5bd5', '2025-03-13', '18:00:00', 'MNP Community Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, '43c82ab9-3681-464e-85ab-278200a8468c', 'bebee5a1-e4b3-4cf5-8b7b-f21115d8fd99', 'd8bebe39-e35d-4ced-a457-4450b72f7785', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('03ced3a6-a030-4dc1-b9af-b9ef7eddb16a', '2025-03-15', '19:30:00', 'Westside Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, 'bebee5a1-e4b3-4cf5-8b7b-f21115d8fd99', '91f50d6e-9cd9-47d5-8ffc-f6117ea9b6bf', 'd8bebe39-e35d-4ced-a457-4450b72f7785', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('b6ff819d-41bb-42b0-9ca6-60fe33216ada', '2025-03-17', '18:00:00', 'Cardel Rec South', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, '91f50d6e-9cd9-47d5-8ffc-f6117ea9b6bf', 'bebee5a1-e4b3-4cf5-8b7b-f21115d8fd99', 'd8bebe39-e35d-4ced-a457-4450b72f7785', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('b1b2e5ff-35bf-43ef-a1b8-803f5a2c074e', '2025-03-19', '19:30:00', 'Vivo Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, 'bebee5a1-e4b3-4cf5-8b7b-f21115d8fd99', '45b27748-f398-49b7-a989-cb82ae648936', 'd8bebe39-e35d-4ced-a457-4450b72f7785', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('7431b4bc-840b-4ff8-8e95-ae2fac1521d5', '2025-03-21', '18:00:00', 'Genesis Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, '45b27748-f398-49b7-a989-cb82ae648936', 'bebee5a1-e4b3-4cf5-8b7b-f21115d8fd99', 'd8bebe39-e35d-4ced-a457-4450b72f7785', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('a829ad5e-b9a0-438b-adba-1c84eb88c360', '2025-03-23', '19:30:00', 'Repsol Sport Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, '43c82ab9-3681-464e-85ab-278200a8468c', '91f50d6e-9cd9-47d5-8ffc-f6117ea9b6bf', 'd8bebe39-e35d-4ced-a457-4450b72f7785', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('4a4b6871-7096-4167-8497-5784534af21d', '2025-03-25', '18:00:00', 'MNP Community Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, '91f50d6e-9cd9-47d5-8ffc-f6117ea9b6bf', '43c82ab9-3681-464e-85ab-278200a8468c', 'd8bebe39-e35d-4ced-a457-4450b72f7785', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('9a8ce3a7-af09-4264-b45a-96ef01bc0bb8', '2025-03-27', '19:30:00', 'Westside Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, '43c82ab9-3681-464e-85ab-278200a8468c', '45b27748-f398-49b7-a989-cb82ae648936', 'd8bebe39-e35d-4ced-a457-4450b72f7785', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('733b5ddb-15a8-440f-bd86-28bc43f12008', '2025-03-29', '18:00:00', 'Cardel Rec South', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, '45b27748-f398-49b7-a989-cb82ae648936', '43c82ab9-3681-464e-85ab-278200a8468c', 'd8bebe39-e35d-4ced-a457-4450b72f7785', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('49fb67e4-e495-43c5-bd21-d64607441e84', '2025-03-31', '19:30:00', 'Vivo Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, '91f50d6e-9cd9-47d5-8ffc-f6117ea9b6bf', '45b27748-f398-49b7-a989-cb82ae648936', 'd8bebe39-e35d-4ced-a457-4450b72f7785', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('7671ae67-0690-4358-ba8d-abe1b7f3b1cf', '2025-04-02', '18:00:00', 'Genesis Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, '45b27748-f398-49b7-a989-cb82ae648936', '91f50d6e-9cd9-47d5-8ffc-f6117ea9b6bf', 'd8bebe39-e35d-4ced-a457-4450b72f7785', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('b9509b12-6602-4f68-a8b6-b82507ed2232', '2025-04-04', '19:30:00', 'Repsol Sport Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, '152354a0-b8e5-4792-8055-4e425ec713e3', 'a96e366c-8729-4fe1-8577-29583dc88cc3', '65291479-8c3f-48c3-a388-b4685600f6b7', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('3a52b605-4b4c-4df9-8dd8-0b933e31271f', '2025-04-06', '18:00:00', 'MNP Community Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, 'a96e366c-8729-4fe1-8577-29583dc88cc3', '152354a0-b8e5-4792-8055-4e425ec713e3', '65291479-8c3f-48c3-a388-b4685600f6b7', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('b1ecca44-3d9b-45ab-958e-de464747f7a1', '2025-04-08', '19:30:00', 'Westside Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, '152354a0-b8e5-4792-8055-4e425ec713e3', '03744f1e-dd97-4fa0-b015-7293e481d906', '65291479-8c3f-48c3-a388-b4685600f6b7', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('80fab69b-861e-44e8-b2ab-79c3849ec56e', '2025-04-10', '18:00:00', 'Cardel Rec South', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, '03744f1e-dd97-4fa0-b015-7293e481d906', '152354a0-b8e5-4792-8055-4e425ec713e3', '65291479-8c3f-48c3-a388-b4685600f6b7', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('8d594346-edea-428f-9a2b-2dd25ca9ee46', '2025-04-12', '19:30:00', 'Vivo Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, '152354a0-b8e5-4792-8055-4e425ec713e3', '2a3796c2-9fe2-415f-8772-35482c20edb7', '65291479-8c3f-48c3-a388-b4685600f6b7', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('3ef3d62a-3ac7-4637-bc77-36875e0756e9', '2025-04-14', '18:00:00', 'Genesis Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, '2a3796c2-9fe2-415f-8772-35482c20edb7', '152354a0-b8e5-4792-8055-4e425ec713e3', '65291479-8c3f-48c3-a388-b4685600f6b7', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('0e879ec0-34d6-476a-a649-fc9b6cd6fad0', '2025-04-16', '19:30:00', 'Repsol Sport Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, '152354a0-b8e5-4792-8055-4e425ec713e3', '212afa89-f352-4419-b1b8-1e635ab8ad6c', '65291479-8c3f-48c3-a388-b4685600f6b7', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('0830b6e0-53a5-4ea6-ac4f-441522d62a13', '2025-04-18', '18:00:00', 'MNP Community Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, '212afa89-f352-4419-b1b8-1e635ab8ad6c', '152354a0-b8e5-4792-8055-4e425ec713e3', '65291479-8c3f-48c3-a388-b4685600f6b7', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('af5adf7f-8870-461f-9403-21d9726d9159', '2025-04-20', '19:30:00', 'Westside Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, '152354a0-b8e5-4792-8055-4e425ec713e3', '01f4be80-7a2b-4d64-81ae-ec84abb6d0f9', '65291479-8c3f-48c3-a388-b4685600f6b7', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('f0b31e3d-9cd6-47af-a2f5-1fb7db51e323', '2025-04-22', '18:00:00', 'Cardel Rec South', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, '01f4be80-7a2b-4d64-81ae-ec84abb6d0f9', '152354a0-b8e5-4792-8055-4e425ec713e3', '65291479-8c3f-48c3-a388-b4685600f6b7', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('e8cb17ba-f7cc-440c-a578-047b269acbf4', '2025-04-24', '19:30:00', 'Vivo Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, 'a96e366c-8729-4fe1-8577-29583dc88cc3', '03744f1e-dd97-4fa0-b015-7293e481d906', '65291479-8c3f-48c3-a388-b4685600f6b7', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('f5fdcb97-4042-4511-9197-bf469ce344c0', '2025-04-26', '18:00:00', 'Genesis Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, '03744f1e-dd97-4fa0-b015-7293e481d906', 'a96e366c-8729-4fe1-8577-29583dc88cc3', '65291479-8c3f-48c3-a388-b4685600f6b7', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('53f36c7f-5736-43ee-9f21-622658521f72', '2025-04-28', '19:30:00', 'Repsol Sport Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, 'a96e366c-8729-4fe1-8577-29583dc88cc3', '2a3796c2-9fe2-415f-8772-35482c20edb7', '65291479-8c3f-48c3-a388-b4685600f6b7', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('a6ef6128-7dc4-44fd-9fdb-45fba473fe60', '2025-04-30', '18:00:00', 'MNP Community Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, '2a3796c2-9fe2-415f-8772-35482c20edb7', 'a96e366c-8729-4fe1-8577-29583dc88cc3', '65291479-8c3f-48c3-a388-b4685600f6b7', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('1775a957-5915-42df-96cc-313f86923c9d', '2025-05-02', '19:30:00', 'Westside Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, 'a96e366c-8729-4fe1-8577-29583dc88cc3', '212afa89-f352-4419-b1b8-1e635ab8ad6c', '65291479-8c3f-48c3-a388-b4685600f6b7', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('9942caed-dc7f-403f-b0ad-da6c9ea5aed5', '2025-05-04', '18:00:00', 'Cardel Rec South', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, '212afa89-f352-4419-b1b8-1e635ab8ad6c', 'a96e366c-8729-4fe1-8577-29583dc88cc3', '65291479-8c3f-48c3-a388-b4685600f6b7', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('2a2cd8bd-76ba-44a0-a188-f268599f07cf', '2025-05-06', '19:30:00', 'Vivo Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, 'a96e366c-8729-4fe1-8577-29583dc88cc3', '01f4be80-7a2b-4d64-81ae-ec84abb6d0f9', '65291479-8c3f-48c3-a388-b4685600f6b7', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('e70900c6-5b9b-4bec-a887-6f27b91cd45b', '2025-05-08', '18:00:00', 'Genesis Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, '01f4be80-7a2b-4d64-81ae-ec84abb6d0f9', 'a96e366c-8729-4fe1-8577-29583dc88cc3', '65291479-8c3f-48c3-a388-b4685600f6b7', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('f453034d-eef9-424c-9c1f-68bebe504c69', '2025-05-10', '19:30:00', 'Repsol Sport Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, '03744f1e-dd97-4fa0-b015-7293e481d906', '2a3796c2-9fe2-415f-8772-35482c20edb7', '65291479-8c3f-48c3-a388-b4685600f6b7', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('69c607ad-29b7-4cf9-af43-98e48cbe9e4d', '2025-05-12', '18:00:00', 'MNP Community Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.457045+00', '2025-10-19 18:06:25.457045+00', 2, 1.00, NULL, '2a3796c2-9fe2-415f-8772-35482c20edb7', '03744f1e-dd97-4fa0-b015-7293e481d906', '65291479-8c3f-48c3-a388-b4685600f6b7', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('c33b382c-3477-4d31-a2d4-fdad92d85cb6', '2025-05-14', '19:30:00', 'Westside Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '03744f1e-dd97-4fa0-b015-7293e481d906', '212afa89-f352-4419-b1b8-1e635ab8ad6c', '65291479-8c3f-48c3-a388-b4685600f6b7', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('96b337db-19fc-4e6c-b8f8-8d7de87f8348', '2025-05-16', '18:00:00', 'Cardel Rec South', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '212afa89-f352-4419-b1b8-1e635ab8ad6c', '03744f1e-dd97-4fa0-b015-7293e481d906', '65291479-8c3f-48c3-a388-b4685600f6b7', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('2d615cf8-ba98-4170-b0c5-272ca9c406a5', '2025-05-18', '19:30:00', 'Vivo Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '03744f1e-dd97-4fa0-b015-7293e481d906', '01f4be80-7a2b-4d64-81ae-ec84abb6d0f9', '65291479-8c3f-48c3-a388-b4685600f6b7', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('7deecb41-e171-4306-80f5-fa91522f45b8', '2025-05-20', '18:00:00', 'Genesis Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '01f4be80-7a2b-4d64-81ae-ec84abb6d0f9', '03744f1e-dd97-4fa0-b015-7293e481d906', '65291479-8c3f-48c3-a388-b4685600f6b7', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('0195fcd5-5181-4f9d-83d3-0e9e2d839db6', '2025-05-22', '19:30:00', 'Repsol Sport Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '2a3796c2-9fe2-415f-8772-35482c20edb7', '212afa89-f352-4419-b1b8-1e635ab8ad6c', '65291479-8c3f-48c3-a388-b4685600f6b7', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('5e5349ec-d9c1-471e-9078-90df2cca5da9', '2025-05-24', '18:00:00', 'MNP Community Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '212afa89-f352-4419-b1b8-1e635ab8ad6c', '2a3796c2-9fe2-415f-8772-35482c20edb7', '65291479-8c3f-48c3-a388-b4685600f6b7', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('3f14b255-be67-46b0-88d2-18821d93d2a5', '2025-05-26', '19:30:00', 'Westside Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '2a3796c2-9fe2-415f-8772-35482c20edb7', '01f4be80-7a2b-4d64-81ae-ec84abb6d0f9', '65291479-8c3f-48c3-a388-b4685600f6b7', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('c1015b2c-8bdc-4ee1-8aa3-2eaefdbc32c7', '2025-05-28', '18:00:00', 'Cardel Rec South', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '01f4be80-7a2b-4d64-81ae-ec84abb6d0f9', '2a3796c2-9fe2-415f-8772-35482c20edb7', '65291479-8c3f-48c3-a388-b4685600f6b7', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('0d538919-77ba-4a39-8548-8ab49b89ef26', '2025-05-30', '19:30:00', 'Vivo Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '212afa89-f352-4419-b1b8-1e635ab8ad6c', '01f4be80-7a2b-4d64-81ae-ec84abb6d0f9', '65291479-8c3f-48c3-a388-b4685600f6b7', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('4a9b418f-d794-45d6-9e7e-6070d65f0483', '2025-06-01', '18:00:00', 'Genesis Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '01f4be80-7a2b-4d64-81ae-ec84abb6d0f9', '212afa89-f352-4419-b1b8-1e635ab8ad6c', '65291479-8c3f-48c3-a388-b4685600f6b7', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('8dcac381-8178-4729-a428-cea9d0b5ef22', '2025-06-03', '19:30:00', 'Repsol Sport Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, 'bca33ae6-160d-4b43-9467-135b7ed9bc39', '5fa4bfca-a15c-4242-b07f-9196777731f6', '63e33115-0684-45ab-bee8-34621778b1fc', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('c18dea90-6f4e-429e-8023-416837d291bb', '2025-06-05', '18:00:00', 'MNP Community Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '5fa4bfca-a15c-4242-b07f-9196777731f6', 'bca33ae6-160d-4b43-9467-135b7ed9bc39', '63e33115-0684-45ab-bee8-34621778b1fc', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('a4cd4aca-8555-47aa-afdc-372bd6ae2f70', '2025-06-07', '19:30:00', 'Westside Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, 'bca33ae6-160d-4b43-9467-135b7ed9bc39', 'e3f4aab3-bb8e-4ba0-a34e-87b9fadfe9f4', '63e33115-0684-45ab-bee8-34621778b1fc', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('d0570f6a-57fc-4e72-b643-d9aae8ebf434', '2025-06-09', '18:00:00', 'Cardel Rec South', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, 'e3f4aab3-bb8e-4ba0-a34e-87b9fadfe9f4', 'bca33ae6-160d-4b43-9467-135b7ed9bc39', '63e33115-0684-45ab-bee8-34621778b1fc', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('bd5da9d6-85d1-4dfe-8d16-f21c4b77c963', '2025-06-11', '19:30:00', 'Vivo Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, 'bca33ae6-160d-4b43-9467-135b7ed9bc39', '538515a7-1c3d-4701-aaff-b4498bf16682', '63e33115-0684-45ab-bee8-34621778b1fc', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('44083c00-e56d-4fe6-9b0b-d5b99758a48e', '2025-06-13', '18:00:00', 'Genesis Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '538515a7-1c3d-4701-aaff-b4498bf16682', 'bca33ae6-160d-4b43-9467-135b7ed9bc39', '63e33115-0684-45ab-bee8-34621778b1fc', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('673584cb-9b66-462d-81e6-b2cacf6eb10b', '2025-06-15', '19:30:00', 'Repsol Sport Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, 'bca33ae6-160d-4b43-9467-135b7ed9bc39', '4453c3f3-7ae0-4b82-9f02-4b043aa8eb6b', '63e33115-0684-45ab-bee8-34621778b1fc', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('2f5ccf0c-ec0b-4ff9-bb95-f846fa33948f', '2025-06-17', '18:00:00', 'MNP Community Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '4453c3f3-7ae0-4b82-9f02-4b043aa8eb6b', 'bca33ae6-160d-4b43-9467-135b7ed9bc39', '63e33115-0684-45ab-bee8-34621778b1fc', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('41116970-c84a-4e75-8afc-8def71f86b97', '2025-06-19', '19:30:00', 'Westside Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, 'bca33ae6-160d-4b43-9467-135b7ed9bc39', '1eea174f-19d2-43bd-b0c8-9eb42b4e0305', '63e33115-0684-45ab-bee8-34621778b1fc', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('5e47dc38-42c2-4378-ab3c-7c242065c5f2', '2025-06-21', '18:00:00', 'Cardel Rec South', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '1eea174f-19d2-43bd-b0c8-9eb42b4e0305', 'bca33ae6-160d-4b43-9467-135b7ed9bc39', '63e33115-0684-45ab-bee8-34621778b1fc', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('4d389442-2b89-41e9-97d7-2329fea66d79', '2025-06-23', '19:30:00', 'Vivo Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '5fa4bfca-a15c-4242-b07f-9196777731f6', 'e3f4aab3-bb8e-4ba0-a34e-87b9fadfe9f4', '63e33115-0684-45ab-bee8-34621778b1fc', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('f22aa3fc-ade9-4af4-b499-a2a592168b8a', '2025-06-25', '18:00:00', 'Genesis Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, 'e3f4aab3-bb8e-4ba0-a34e-87b9fadfe9f4', '5fa4bfca-a15c-4242-b07f-9196777731f6', '63e33115-0684-45ab-bee8-34621778b1fc', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('8600bb53-f151-481e-8b84-a2d8dece7716', '2025-06-27', '19:30:00', 'Repsol Sport Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '5fa4bfca-a15c-4242-b07f-9196777731f6', '538515a7-1c3d-4701-aaff-b4498bf16682', '63e33115-0684-45ab-bee8-34621778b1fc', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('681f0f8b-a445-4423-8695-4d4762e5bac5', '2025-06-29', '18:00:00', 'MNP Community Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '538515a7-1c3d-4701-aaff-b4498bf16682', '5fa4bfca-a15c-4242-b07f-9196777731f6', '63e33115-0684-45ab-bee8-34621778b1fc', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('e11ad2e0-cc90-42a7-aa30-a1f115adde41', '2025-07-01', '19:30:00', 'Westside Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '5fa4bfca-a15c-4242-b07f-9196777731f6', '4453c3f3-7ae0-4b82-9f02-4b043aa8eb6b', '63e33115-0684-45ab-bee8-34621778b1fc', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('4081c212-705b-4b6c-810d-553f44d5259b', '2025-07-03', '18:00:00', 'Cardel Rec South', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '4453c3f3-7ae0-4b82-9f02-4b043aa8eb6b', '5fa4bfca-a15c-4242-b07f-9196777731f6', '63e33115-0684-45ab-bee8-34621778b1fc', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('a169f0f9-099d-46aa-81ba-19718b81efb7', '2025-07-05', '19:30:00', 'Vivo Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '5fa4bfca-a15c-4242-b07f-9196777731f6', '1eea174f-19d2-43bd-b0c8-9eb42b4e0305', '63e33115-0684-45ab-bee8-34621778b1fc', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('e8fa38c9-2746-465a-afba-56df94972915', '2025-07-07', '18:00:00', 'Genesis Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '1eea174f-19d2-43bd-b0c8-9eb42b4e0305', '5fa4bfca-a15c-4242-b07f-9196777731f6', '63e33115-0684-45ab-bee8-34621778b1fc', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('4cc0193c-24cf-4cec-a2be-a69d261f6b71', '2025-07-09', '19:30:00', 'Repsol Sport Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, 'e3f4aab3-bb8e-4ba0-a34e-87b9fadfe9f4', '538515a7-1c3d-4701-aaff-b4498bf16682', '63e33115-0684-45ab-bee8-34621778b1fc', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('20d8dfdc-5486-4977-b807-113323c64cfc', '2025-07-11', '18:00:00', 'MNP Community Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '538515a7-1c3d-4701-aaff-b4498bf16682', 'e3f4aab3-bb8e-4ba0-a34e-87b9fadfe9f4', '63e33115-0684-45ab-bee8-34621778b1fc', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('fdbd2c3d-9884-4e44-95bf-c0cd2fe376f8', '2025-07-13', '19:30:00', 'Westside Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, 'e3f4aab3-bb8e-4ba0-a34e-87b9fadfe9f4', '4453c3f3-7ae0-4b82-9f02-4b043aa8eb6b', '63e33115-0684-45ab-bee8-34621778b1fc', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('206c7432-bb76-43b7-8bda-86615ecc7330', '2025-07-15', '18:00:00', 'Cardel Rec South', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '4453c3f3-7ae0-4b82-9f02-4b043aa8eb6b', 'e3f4aab3-bb8e-4ba0-a34e-87b9fadfe9f4', '63e33115-0684-45ab-bee8-34621778b1fc', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('1857e159-425d-481d-aafc-36a43d193a60', '2025-07-17', '19:30:00', 'Vivo Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, 'e3f4aab3-bb8e-4ba0-a34e-87b9fadfe9f4', '1eea174f-19d2-43bd-b0c8-9eb42b4e0305', '63e33115-0684-45ab-bee8-34621778b1fc', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('e07df410-761c-4da5-b09d-61cc0294fd68', '2025-07-19', '18:00:00', 'Genesis Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '1eea174f-19d2-43bd-b0c8-9eb42b4e0305', 'e3f4aab3-bb8e-4ba0-a34e-87b9fadfe9f4', '63e33115-0684-45ab-bee8-34621778b1fc', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('9ad0eb54-190f-4c17-b1dc-576bbc76fc96', '2025-07-21', '19:30:00', 'Repsol Sport Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '538515a7-1c3d-4701-aaff-b4498bf16682', '4453c3f3-7ae0-4b82-9f02-4b043aa8eb6b', '63e33115-0684-45ab-bee8-34621778b1fc', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('2902f2e5-a206-422b-8df2-faf854860208', '2025-07-23', '18:00:00', 'MNP Community Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '4453c3f3-7ae0-4b82-9f02-4b043aa8eb6b', '538515a7-1c3d-4701-aaff-b4498bf16682', '63e33115-0684-45ab-bee8-34621778b1fc', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('828e1162-dace-4e1d-afb4-42eaa35748be', '2025-07-25', '19:30:00', 'Westside Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '538515a7-1c3d-4701-aaff-b4498bf16682', '1eea174f-19d2-43bd-b0c8-9eb42b4e0305', '63e33115-0684-45ab-bee8-34621778b1fc', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('8a60de3f-121d-4dd2-bbf2-4698f6ecceea', '2025-07-27', '18:00:00', 'Cardel Rec South', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '1eea174f-19d2-43bd-b0c8-9eb42b4e0305', '538515a7-1c3d-4701-aaff-b4498bf16682', '63e33115-0684-45ab-bee8-34621778b1fc', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('e078a599-38be-4832-bec8-ac085949a449', '2025-07-29', '19:30:00', 'Vivo Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '4453c3f3-7ae0-4b82-9f02-4b043aa8eb6b', '1eea174f-19d2-43bd-b0c8-9eb42b4e0305', '63e33115-0684-45ab-bee8-34621778b1fc', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('8a26192e-2a84-4f6f-9d8e-3c1fda22f955', '2025-07-31', '18:00:00', 'Genesis Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '1eea174f-19d2-43bd-b0c8-9eb42b4e0305', '4453c3f3-7ae0-4b82-9f02-4b043aa8eb6b', '63e33115-0684-45ab-bee8-34621778b1fc', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('be115a60-208f-4004-a7c1-9f08c615fc1e', '2025-08-02', '19:30:00', 'Repsol Sport Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '00acc96e-d4ea-4329-8844-3225c6469f29', '65bb63c1-2b15-45d7-8eee-058f3da7496c', 'd8c6bb62-613a-4098-9461-73817bf5d54d', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('6090973e-1808-4ce1-ad72-ffc0ceaef3e5', '2025-08-04', '18:00:00', 'MNP Community Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '65bb63c1-2b15-45d7-8eee-058f3da7496c', '00acc96e-d4ea-4329-8844-3225c6469f29', 'd8c6bb62-613a-4098-9461-73817bf5d54d', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('77998173-b29f-45c4-8af5-654fd86a3b76', '2025-08-06', '19:30:00', 'Westside Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '00acc96e-d4ea-4329-8844-3225c6469f29', '1d770bba-da30-4752-ad3b-6232a069646e', 'd8c6bb62-613a-4098-9461-73817bf5d54d', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('538176a3-1d72-4a98-85d7-6147b444834c', '2025-08-08', '18:00:00', 'Cardel Rec South', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '1d770bba-da30-4752-ad3b-6232a069646e', '00acc96e-d4ea-4329-8844-3225c6469f29', 'd8c6bb62-613a-4098-9461-73817bf5d54d', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('e7af4506-af6f-444d-99e4-b3d451eadca2', '2025-08-10', '19:30:00', 'Vivo Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '00acc96e-d4ea-4329-8844-3225c6469f29', 'c16f608d-ca67-4aef-b270-e080ed42daf4', 'd8c6bb62-613a-4098-9461-73817bf5d54d', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('672806ca-7558-404a-b79e-63741c676dbf', '2025-08-12', '18:00:00', 'Genesis Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, 'c16f608d-ca67-4aef-b270-e080ed42daf4', '00acc96e-d4ea-4329-8844-3225c6469f29', 'd8c6bb62-613a-4098-9461-73817bf5d54d', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('081cd6c2-9853-48b0-9dc9-ddc921ba9cc1', '2025-08-14', '19:30:00', 'Repsol Sport Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '00acc96e-d4ea-4329-8844-3225c6469f29', '7c8d6e59-8685-4102-958e-56648b5bb740', 'd8c6bb62-613a-4098-9461-73817bf5d54d', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('95d54202-1d97-4cf6-8163-9fb3b9468e24', '2025-08-16', '18:00:00', 'MNP Community Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '7c8d6e59-8685-4102-958e-56648b5bb740', '00acc96e-d4ea-4329-8844-3225c6469f29', 'd8c6bb62-613a-4098-9461-73817bf5d54d', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('5ec731b5-62a2-473d-bf39-eecebfd79c97', '2025-08-18', '19:30:00', 'Westside Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '00acc96e-d4ea-4329-8844-3225c6469f29', '3f1a0e79-c8d5-4840-9587-1df7a090d512', 'd8c6bb62-613a-4098-9461-73817bf5d54d', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('80ad4e57-722a-4cf9-a46e-ddf2baa99695', '2025-08-20', '18:00:00', 'Cardel Rec South', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.471294+00', '2025-10-19 18:06:25.471294+00', 2, 1.00, NULL, '3f1a0e79-c8d5-4840-9587-1df7a090d512', '00acc96e-d4ea-4329-8844-3225c6469f29', 'd8c6bb62-613a-4098-9461-73817bf5d54d', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('32ca764b-0d2a-4c13-b8dc-dd8a00c0c921', '2025-08-22', '19:30:00', 'Vivo Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, '65bb63c1-2b15-45d7-8eee-058f3da7496c', '1d770bba-da30-4752-ad3b-6232a069646e', 'd8c6bb62-613a-4098-9461-73817bf5d54d', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('373299f2-0ffc-4f37-959a-134faf307933', '2025-08-24', '18:00:00', 'Genesis Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, '1d770bba-da30-4752-ad3b-6232a069646e', '65bb63c1-2b15-45d7-8eee-058f3da7496c', 'd8c6bb62-613a-4098-9461-73817bf5d54d', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('536e8e4c-0c01-414f-8885-024fb8f3bb44', '2025-08-26', '19:30:00', 'Repsol Sport Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, '65bb63c1-2b15-45d7-8eee-058f3da7496c', 'c16f608d-ca67-4aef-b270-e080ed42daf4', 'd8c6bb62-613a-4098-9461-73817bf5d54d', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('91b4c0a8-eaac-4e8f-8dee-c22d90c6d06a', '2025-08-28', '18:00:00', 'MNP Community Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, 'c16f608d-ca67-4aef-b270-e080ed42daf4', '65bb63c1-2b15-45d7-8eee-058f3da7496c', 'd8c6bb62-613a-4098-9461-73817bf5d54d', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('5bbef939-f211-41f8-8d3c-ded027ba551d', '2025-08-30', '19:30:00', 'Westside Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, '65bb63c1-2b15-45d7-8eee-058f3da7496c', '7c8d6e59-8685-4102-958e-56648b5bb740', 'd8c6bb62-613a-4098-9461-73817bf5d54d', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('dc4416ba-555d-4ef6-83ee-957bf09ca473', '2025-09-01', '18:00:00', 'Cardel Rec South', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, '7c8d6e59-8685-4102-958e-56648b5bb740', '65bb63c1-2b15-45d7-8eee-058f3da7496c', 'd8c6bb62-613a-4098-9461-73817bf5d54d', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('4da49409-be71-4a47-a4d1-514cd6acdb4f', '2025-09-03', '19:30:00', 'Vivo Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, '65bb63c1-2b15-45d7-8eee-058f3da7496c', '3f1a0e79-c8d5-4840-9587-1df7a090d512', 'd8c6bb62-613a-4098-9461-73817bf5d54d', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('c215f2d5-e22f-4ecd-b24a-70824c208019', '2025-09-05', '18:00:00', 'Genesis Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, '3f1a0e79-c8d5-4840-9587-1df7a090d512', '65bb63c1-2b15-45d7-8eee-058f3da7496c', 'd8c6bb62-613a-4098-9461-73817bf5d54d', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('f1d4e916-b036-4a23-84c6-f6a1f17d720c', '2025-09-07', '19:30:00', 'Repsol Sport Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, '1d770bba-da30-4752-ad3b-6232a069646e', 'c16f608d-ca67-4aef-b270-e080ed42daf4', 'd8c6bb62-613a-4098-9461-73817bf5d54d', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('8879ca7f-83cd-432e-926b-2b8750a3b657', '2025-09-09', '18:00:00', 'MNP Community Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, 'c16f608d-ca67-4aef-b270-e080ed42daf4', '1d770bba-da30-4752-ad3b-6232a069646e', 'd8c6bb62-613a-4098-9461-73817bf5d54d', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('62a16a99-3341-41fc-a3fc-ef2cb22bef14', '2025-09-11', '19:30:00', 'Westside Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, '1d770bba-da30-4752-ad3b-6232a069646e', '7c8d6e59-8685-4102-958e-56648b5bb740', 'd8c6bb62-613a-4098-9461-73817bf5d54d', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('baf30d19-978f-4a34-b0c7-a3c48fe943e8', '2025-09-13', '18:00:00', 'Cardel Rec South', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, '7c8d6e59-8685-4102-958e-56648b5bb740', '1d770bba-da30-4752-ad3b-6232a069646e', 'd8c6bb62-613a-4098-9461-73817bf5d54d', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('0a4f2df6-0e18-434a-8300-248ab5cbac44', '2025-09-15', '19:30:00', 'Vivo Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, '1d770bba-da30-4752-ad3b-6232a069646e', '3f1a0e79-c8d5-4840-9587-1df7a090d512', 'd8c6bb62-613a-4098-9461-73817bf5d54d', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('7f8a5105-a9be-4f1c-a2d0-cbcccaf92d3d', '2025-09-17', '18:00:00', 'Genesis Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, '3f1a0e79-c8d5-4840-9587-1df7a090d512', '1d770bba-da30-4752-ad3b-6232a069646e', 'd8c6bb62-613a-4098-9461-73817bf5d54d', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('084c3f12-7729-4f30-82d7-388c5bef2ce2', '2025-09-19', '19:30:00', 'Repsol Sport Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, 'c16f608d-ca67-4aef-b270-e080ed42daf4', '7c8d6e59-8685-4102-958e-56648b5bb740', 'd8c6bb62-613a-4098-9461-73817bf5d54d', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('55a4c7f0-180f-426d-b07d-96b2a752e05f', '2025-09-21', '18:00:00', 'MNP Community Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, '7c8d6e59-8685-4102-958e-56648b5bb740', 'c16f608d-ca67-4aef-b270-e080ed42daf4', 'd8c6bb62-613a-4098-9461-73817bf5d54d', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('5cfd9eaf-e6f3-4f0d-bc98-a131f2d1323d', '2025-09-23', '19:30:00', 'Westside Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, 'c16f608d-ca67-4aef-b270-e080ed42daf4', '3f1a0e79-c8d5-4840-9587-1df7a090d512', 'd8c6bb62-613a-4098-9461-73817bf5d54d', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('72f084d3-1d59-4daf-aab9-a2c10d7ea387', '2025-09-25', '18:00:00', 'Cardel Rec South', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, '3f1a0e79-c8d5-4840-9587-1df7a090d512', 'c16f608d-ca67-4aef-b270-e080ed42daf4', 'd8c6bb62-613a-4098-9461-73817bf5d54d', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('15d8903b-5520-455e-8c73-13bc37a10f03', '2025-09-27', '19:30:00', 'Vivo Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, '7c8d6e59-8685-4102-958e-56648b5bb740', '3f1a0e79-c8d5-4840-9587-1df7a090d512', 'd8c6bb62-613a-4098-9461-73817bf5d54d', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('40855567-20b2-4eb9-8568-13f8e47203d4', '2025-09-29', '18:00:00', 'Genesis Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, '3f1a0e79-c8d5-4840-9587-1df7a090d512', '7c8d6e59-8685-4102-958e-56648b5bb740', 'd8c6bb62-613a-4098-9461-73817bf5d54d', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('f7aeb3b3-14c0-4ae3-93eb-98118e383aa2', '2025-10-01', '19:30:00', 'Repsol Sport Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, 'caad1a83-a043-4225-a054-3a976190b2bd', 'ed60175e-61b5-4633-9016-f0cf56de433e', '0bf1247d-e0c0-44a3-a756-3066a966a25c', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('dd9dc523-f1a8-46ed-ae17-7a24f012a055', '2025-10-03', '18:00:00', 'MNP Community Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, 'ed60175e-61b5-4633-9016-f0cf56de433e', 'caad1a83-a043-4225-a054-3a976190b2bd', '0bf1247d-e0c0-44a3-a756-3066a966a25c', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('d8b2d435-3ee4-4b74-8dcf-b27c050dba1b', '2025-10-05', '19:30:00', 'Westside Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, 'caad1a83-a043-4225-a054-3a976190b2bd', 'd6675d34-bb2e-480a-b789-acaa776b13f7', '0bf1247d-e0c0-44a3-a756-3066a966a25c', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('827da257-9da9-442e-b2bc-278d8851d1ad', '2025-10-07', '18:00:00', 'Cardel Rec South', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, 'd6675d34-bb2e-480a-b789-acaa776b13f7', 'caad1a83-a043-4225-a054-3a976190b2bd', '0bf1247d-e0c0-44a3-a756-3066a966a25c', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('6a37dd27-6a85-4944-a43d-2a99689b08e6', '2025-10-09', '19:30:00', 'Vivo Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, 'caad1a83-a043-4225-a054-3a976190b2bd', 'db512cb4-53a6-4e52-815e-a811bbaa7751', '0bf1247d-e0c0-44a3-a756-3066a966a25c', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('91117d7e-36d5-4c00-97b1-765539c27665', '2025-10-11', '18:00:00', 'Genesis Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, 'db512cb4-53a6-4e52-815e-a811bbaa7751', 'caad1a83-a043-4225-a054-3a976190b2bd', '0bf1247d-e0c0-44a3-a756-3066a966a25c', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('2fa40a7f-33a6-4caf-97fc-00807e9ee0b2', '2025-10-13', '19:30:00', 'Repsol Sport Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, 'caad1a83-a043-4225-a054-3a976190b2bd', '0152c01b-766d-42fa-ada2-0f433627c26b', '0bf1247d-e0c0-44a3-a756-3066a966a25c', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('e9852de8-822a-43e2-967f-e28c20338b8c', '2025-10-15', '18:00:00', 'MNP Community Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, '0152c01b-766d-42fa-ada2-0f433627c26b', 'caad1a83-a043-4225-a054-3a976190b2bd', '0bf1247d-e0c0-44a3-a756-3066a966a25c', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('98fa037e-a65d-45d1-8e13-ad28e028ce49', '2025-10-17', '19:30:00', 'Westside Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, 'caad1a83-a043-4225-a054-3a976190b2bd', '9fb50890-0032-4049-80b7-8c02970f7387', '0bf1247d-e0c0-44a3-a756-3066a966a25c', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('3da914fd-2cb9-4de1-9a68-6758077e7abf', '2025-10-19', '18:00:00', 'Cardel Rec South', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, '9fb50890-0032-4049-80b7-8c02970f7387', 'caad1a83-a043-4225-a054-3a976190b2bd', '0bf1247d-e0c0-44a3-a756-3066a966a25c', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('555dfdf1-827f-4998-ba0e-49ea44ea2818', '2025-10-21', '19:30:00', 'Vivo Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, 'ed60175e-61b5-4633-9016-f0cf56de433e', 'd6675d34-bb2e-480a-b789-acaa776b13f7', '0bf1247d-e0c0-44a3-a756-3066a966a25c', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('fe61e758-825e-4d98-af0e-3b8c0e9d309d', '2025-10-23', '18:00:00', 'Genesis Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, 'd6675d34-bb2e-480a-b789-acaa776b13f7', 'ed60175e-61b5-4633-9016-f0cf56de433e', '0bf1247d-e0c0-44a3-a756-3066a966a25c', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('117a1e4f-2ced-4fb2-b2ab-aa000737bae7', '2025-10-25', '19:30:00', 'Repsol Sport Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, 'ed60175e-61b5-4633-9016-f0cf56de433e', 'db512cb4-53a6-4e52-815e-a811bbaa7751', '0bf1247d-e0c0-44a3-a756-3066a966a25c', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('320a2021-6d80-4e97-a108-b30ec5e43fbe', '2025-10-27', '18:00:00', 'MNP Community Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, 'db512cb4-53a6-4e52-815e-a811bbaa7751', 'ed60175e-61b5-4633-9016-f0cf56de433e', '0bf1247d-e0c0-44a3-a756-3066a966a25c', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('bc7f1f9f-f554-495c-b957-ddf89f7558b7', '2025-10-29', '19:30:00', 'Westside Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, 'ed60175e-61b5-4633-9016-f0cf56de433e', '0152c01b-766d-42fa-ada2-0f433627c26b', '0bf1247d-e0c0-44a3-a756-3066a966a25c', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('e9a015f6-2df7-4778-9d08-3fa6213eb1ce', '2025-10-31', '18:00:00', 'Cardel Rec South', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, '0152c01b-766d-42fa-ada2-0f433627c26b', 'ed60175e-61b5-4633-9016-f0cf56de433e', '0bf1247d-e0c0-44a3-a756-3066a966a25c', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('07e84065-5770-4f14-b8e4-b46556a71620', '2025-11-02', '19:30:00', 'Vivo Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, 'ed60175e-61b5-4633-9016-f0cf56de433e', '9fb50890-0032-4049-80b7-8c02970f7387', '0bf1247d-e0c0-44a3-a756-3066a966a25c', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('56ddc138-63d9-4f2e-8fa4-e21d3461709b', '2025-11-04', '18:00:00', 'Genesis Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, '9fb50890-0032-4049-80b7-8c02970f7387', 'ed60175e-61b5-4633-9016-f0cf56de433e', '0bf1247d-e0c0-44a3-a756-3066a966a25c', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('4a26dda6-254e-45e1-9b5b-26fc0d6a1359', '2025-11-06', '19:30:00', 'Repsol Sport Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, 'd6675d34-bb2e-480a-b789-acaa776b13f7', 'db512cb4-53a6-4e52-815e-a811bbaa7751', '0bf1247d-e0c0-44a3-a756-3066a966a25c', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('4194dfe1-7deb-4462-b7d7-f322a2019e4e', '2025-11-08', '18:00:00', 'MNP Community Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, 'db512cb4-53a6-4e52-815e-a811bbaa7751', 'd6675d34-bb2e-480a-b789-acaa776b13f7', '0bf1247d-e0c0-44a3-a756-3066a966a25c', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('a7446890-a362-40d5-b396-88498162379e', '2025-11-10', '19:30:00', 'Westside Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, 'd6675d34-bb2e-480a-b789-acaa776b13f7', '0152c01b-766d-42fa-ada2-0f433627c26b', '0bf1247d-e0c0-44a3-a756-3066a966a25c', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('c8ad13c4-215f-4134-a89a-cd5e0700c7d1', '2025-11-12', '18:00:00', 'Cardel Rec South', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, '0152c01b-766d-42fa-ada2-0f433627c26b', 'd6675d34-bb2e-480a-b789-acaa776b13f7', '0bf1247d-e0c0-44a3-a756-3066a966a25c', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('cf3283b1-4ac6-4d3a-a830-9631b919b271', '2025-11-14', '19:30:00', 'Vivo Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, 'd6675d34-bb2e-480a-b789-acaa776b13f7', '9fb50890-0032-4049-80b7-8c02970f7387', '0bf1247d-e0c0-44a3-a756-3066a966a25c', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('9f49a6b9-ed96-4463-96ac-8b440781781c', '2025-11-16', '18:00:00', 'Genesis Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, '9fb50890-0032-4049-80b7-8c02970f7387', 'd6675d34-bb2e-480a-b789-acaa776b13f7', '0bf1247d-e0c0-44a3-a756-3066a966a25c', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('094f8266-5460-46cb-92b3-2a30abc8f41a', '2025-11-18', '19:30:00', 'Repsol Sport Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, 'db512cb4-53a6-4e52-815e-a811bbaa7751', '0152c01b-766d-42fa-ada2-0f433627c26b', '0bf1247d-e0c0-44a3-a756-3066a966a25c', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('913b5de1-2868-4e0d-bb95-0ca3f06eb6e8', '2025-11-20', '18:00:00', 'MNP Community Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, '0152c01b-766d-42fa-ada2-0f433627c26b', 'db512cb4-53a6-4e52-815e-a811bbaa7751', '0bf1247d-e0c0-44a3-a756-3066a966a25c', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('1003d57e-5fb9-4dcd-b80a-a642ff84da12', '2025-11-22', '19:30:00', 'Westside Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, 'db512cb4-53a6-4e52-815e-a811bbaa7751', '9fb50890-0032-4049-80b7-8c02970f7387', '0bf1247d-e0c0-44a3-a756-3066a966a25c', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('dbe8f5a7-2b05-45cd-a7a2-a5c0cbd066f8', '2025-11-24', '18:00:00', 'Cardel Rec South', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, '9fb50890-0032-4049-80b7-8c02970f7387', 'db512cb4-53a6-4e52-815e-a811bbaa7751', '0bf1247d-e0c0-44a3-a756-3066a966a25c', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('c4b42c96-d15e-48b2-9d05-97fe71147a65', '2025-11-26', '19:30:00', 'Vivo Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, '0152c01b-766d-42fa-ada2-0f433627c26b', '9fb50890-0032-4049-80b7-8c02970f7387', '0bf1247d-e0c0-44a3-a756-3066a966a25c', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('78e38efc-a0cd-4a71-a723-85537628ccf2', '2025-11-28', '18:00:00', 'Genesis Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.482594+00', '2025-10-19 18:06:25.482594+00', 2, 1.00, NULL, '9fb50890-0032-4049-80b7-8c02970f7387', '0152c01b-766d-42fa-ada2-0f433627c26b', '0bf1247d-e0c0-44a3-a756-3066a966a25c', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('0ca9404d-b0d2-4c85-9882-3e1d686deb7c', '2025-11-30', '19:30:00', 'Repsol Sport Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.493243+00', '2025-10-19 18:06:25.493243+00', 2, 1.00, NULL, '81be27e8-f5c7-4a70-96b6-e0d8ce04e04e', 'bce14902-184d-4444-86c4-f71ce6d7fc7a', 'c3244cb2-439b-437c-b13b-80a7220439ef', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('44570974-721a-420b-90a2-99df8e46d877', '2025-12-02', '18:00:00', 'MNP Community Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.493243+00', '2025-10-19 18:06:25.493243+00', 2, 1.00, NULL, 'bce14902-184d-4444-86c4-f71ce6d7fc7a', '81be27e8-f5c7-4a70-96b6-e0d8ce04e04e', 'c3244cb2-439b-437c-b13b-80a7220439ef', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('51c4914b-02a1-41b7-a20f-0bd7178a4c5d', '2025-12-04', '19:30:00', 'Westside Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.493243+00', '2025-10-19 18:06:25.493243+00', 2, 1.00, NULL, '81be27e8-f5c7-4a70-96b6-e0d8ce04e04e', 'd59c5e51-98e6-4a3c-acc8-75941de283b6', 'c3244cb2-439b-437c-b13b-80a7220439ef', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('1d2ab04a-371e-4bad-ba3b-b4a3b57c6847', '2025-12-06', '18:00:00', 'Cardel Rec South', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.493243+00', '2025-10-19 18:06:25.493243+00', 2, 1.00, NULL, 'd59c5e51-98e6-4a3c-acc8-75941de283b6', '81be27e8-f5c7-4a70-96b6-e0d8ce04e04e', 'c3244cb2-439b-437c-b13b-80a7220439ef', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('ae80d2b7-dff3-4b36-90cd-edac69d7532f', '2025-12-08', '19:30:00', 'Vivo Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.493243+00', '2025-10-19 18:06:25.493243+00', 2, 1.00, NULL, '81be27e8-f5c7-4a70-96b6-e0d8ce04e04e', '7768ddd9-a3e0-423b-9f06-2513d1cd5d9f', 'c3244cb2-439b-437c-b13b-80a7220439ef', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('a1f88bc5-b453-4baa-ba88-7acd6f4bf42c', '2025-12-10', '18:00:00', 'Genesis Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.493243+00', '2025-10-19 18:06:25.493243+00', 2, 1.00, NULL, '7768ddd9-a3e0-423b-9f06-2513d1cd5d9f', '81be27e8-f5c7-4a70-96b6-e0d8ce04e04e', 'c3244cb2-439b-437c-b13b-80a7220439ef', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('5e3b4794-65f2-476a-a783-0e2e0e44826c', '2025-12-12', '19:30:00', 'Repsol Sport Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.493243+00', '2025-10-19 18:06:25.493243+00', 2, 1.00, NULL, '81be27e8-f5c7-4a70-96b6-e0d8ce04e04e', '1c0553cd-4cc5-4300-859c-6f764454388c', 'c3244cb2-439b-437c-b13b-80a7220439ef', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('05d2581f-56cf-4e5e-beff-d78ffd372b96', '2025-12-14', '18:00:00', 'MNP Community Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.493243+00', '2025-10-19 18:06:25.493243+00', 2, 1.00, NULL, '1c0553cd-4cc5-4300-859c-6f764454388c', '81be27e8-f5c7-4a70-96b6-e0d8ce04e04e', 'c3244cb2-439b-437c-b13b-80a7220439ef', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('3187f79c-992c-4181-8226-dc59bdcfa896', '2025-12-16', '19:30:00', 'Westside Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.493243+00', '2025-10-19 18:06:25.493243+00', 2, 1.00, NULL, '81be27e8-f5c7-4a70-96b6-e0d8ce04e04e', '69fbccbb-23f0-4c64-98fd-0f9f8f89b3a6', 'c3244cb2-439b-437c-b13b-80a7220439ef', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('6e6eb7c9-c02d-487c-a332-884fcdb1e31a', '2025-12-18', '18:00:00', 'Cardel Rec South', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.493243+00', '2025-10-19 18:06:25.493243+00', 2, 1.00, NULL, '69fbccbb-23f0-4c64-98fd-0f9f8f89b3a6', '81be27e8-f5c7-4a70-96b6-e0d8ce04e04e', 'c3244cb2-439b-437c-b13b-80a7220439ef', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('c73eef91-4e99-4697-8dc4-b3bd86b98cdd', '2025-12-20', '19:30:00', 'Vivo Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.493243+00', '2025-10-19 18:06:25.493243+00', 2, 1.00, NULL, 'bce14902-184d-4444-86c4-f71ce6d7fc7a', 'd59c5e51-98e6-4a3c-acc8-75941de283b6', 'c3244cb2-439b-437c-b13b-80a7220439ef', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('618e5628-176e-49ea-a56c-fd4888e02add', '2025-12-22', '18:00:00', 'Genesis Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.493243+00', '2025-10-19 18:06:25.493243+00', 2, 1.00, NULL, 'd59c5e51-98e6-4a3c-acc8-75941de283b6', 'bce14902-184d-4444-86c4-f71ce6d7fc7a', 'c3244cb2-439b-437c-b13b-80a7220439ef', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('a36db172-8bda-451e-bd5d-53aa293039e3', '2025-12-24', '19:30:00', 'Repsol Sport Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.493243+00', '2025-10-19 18:06:25.493243+00', 2, 1.00, NULL, 'bce14902-184d-4444-86c4-f71ce6d7fc7a', '7768ddd9-a3e0-423b-9f06-2513d1cd5d9f', 'c3244cb2-439b-437c-b13b-80a7220439ef', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('97c81f5b-290d-41bb-a6a6-e9258417de6b', '2025-12-26', '18:00:00', 'MNP Community Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.493243+00', '2025-10-19 18:06:25.493243+00', 2, 1.00, NULL, '7768ddd9-a3e0-423b-9f06-2513d1cd5d9f', 'bce14902-184d-4444-86c4-f71ce6d7fc7a', 'c3244cb2-439b-437c-b13b-80a7220439ef', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('48c4a038-0077-44fe-b35d-4931600e8a7d', '2025-12-28', '19:30:00', 'Westside Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.493243+00', '2025-10-19 18:06:25.493243+00', 2, 1.00, NULL, 'bce14902-184d-4444-86c4-f71ce6d7fc7a', '1c0553cd-4cc5-4300-859c-6f764454388c', 'c3244cb2-439b-437c-b13b-80a7220439ef', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('51d0efe3-0ceb-458a-b6d7-b95f77cb0f18', '2025-12-30', '18:00:00', 'Cardel Rec South', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.493243+00', '2025-10-19 18:06:25.493243+00', 2, 1.00, NULL, '1c0553cd-4cc5-4300-859c-6f764454388c', 'bce14902-184d-4444-86c4-f71ce6d7fc7a', 'c3244cb2-439b-437c-b13b-80a7220439ef', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('42bd08a0-15b8-423e-b17d-256d3a836557', '2026-01-01', '19:30:00', 'Vivo Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.493243+00', '2025-10-19 18:06:25.493243+00', 2, 1.00, NULL, 'bce14902-184d-4444-86c4-f71ce6d7fc7a', '69fbccbb-23f0-4c64-98fd-0f9f8f89b3a6', 'c3244cb2-439b-437c-b13b-80a7220439ef', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('8d7e9d90-06c4-4106-b480-6b6fa0dc4edb', '2026-01-03', '18:00:00', 'Genesis Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.493243+00', '2025-10-19 18:06:25.493243+00', 2, 1.00, NULL, '69fbccbb-23f0-4c64-98fd-0f9f8f89b3a6', 'bce14902-184d-4444-86c4-f71ce6d7fc7a', 'c3244cb2-439b-437c-b13b-80a7220439ef', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('d81547e9-a57d-4324-9261-364938df97c4', '2026-01-05', '19:30:00', 'Repsol Sport Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.493243+00', '2025-10-19 18:06:25.493243+00', 2, 1.00, NULL, 'd59c5e51-98e6-4a3c-acc8-75941de283b6', '7768ddd9-a3e0-423b-9f06-2513d1cd5d9f', 'c3244cb2-439b-437c-b13b-80a7220439ef', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('820a0217-c091-47dd-9925-e06dbd522688', '2026-01-07', '18:00:00', 'MNP Community Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.493243+00', '2025-10-19 18:06:25.493243+00', 2, 1.00, NULL, '7768ddd9-a3e0-423b-9f06-2513d1cd5d9f', 'd59c5e51-98e6-4a3c-acc8-75941de283b6', 'c3244cb2-439b-437c-b13b-80a7220439ef', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('9b66a385-79d1-4bd5-a14d-4d425e9b0507', '2026-01-09', '19:30:00', 'Westside Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.493243+00', '2025-10-19 18:06:25.493243+00', 2, 1.00, NULL, 'd59c5e51-98e6-4a3c-acc8-75941de283b6', '1c0553cd-4cc5-4300-859c-6f764454388c', 'c3244cb2-439b-437c-b13b-80a7220439ef', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('e3ee9dfd-70b8-412c-8882-b9b9162b795e', '2026-01-11', '18:00:00', 'Cardel Rec South', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.493243+00', '2025-10-19 18:06:25.493243+00', 2, 1.00, NULL, '1c0553cd-4cc5-4300-859c-6f764454388c', 'd59c5e51-98e6-4a3c-acc8-75941de283b6', 'c3244cb2-439b-437c-b13b-80a7220439ef', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('00fbe3f4-8664-4a7f-bc4f-ec008ce94566', '2026-01-13', '19:30:00', 'Vivo Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.493243+00', '2025-10-19 18:06:25.493243+00', 2, 1.00, NULL, 'd59c5e51-98e6-4a3c-acc8-75941de283b6', '69fbccbb-23f0-4c64-98fd-0f9f8f89b3a6', 'c3244cb2-439b-437c-b13b-80a7220439ef', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('28ddb331-1c77-4898-81d7-767b5d8d6804', '2026-01-15', '18:00:00', 'Genesis Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.493243+00', '2025-10-19 18:06:25.493243+00', 2, 1.00, NULL, '69fbccbb-23f0-4c64-98fd-0f9f8f89b3a6', 'd59c5e51-98e6-4a3c-acc8-75941de283b6', 'c3244cb2-439b-437c-b13b-80a7220439ef', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('04f8198c-2dee-40b7-b9d2-423a8691a8a2', '2026-01-17', '19:30:00', 'Repsol Sport Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.493243+00', '2025-10-19 18:06:25.493243+00', 2, 1.00, NULL, '7768ddd9-a3e0-423b-9f06-2513d1cd5d9f', '1c0553cd-4cc5-4300-859c-6f764454388c', 'c3244cb2-439b-437c-b13b-80a7220439ef', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('645cbd08-89d3-4a9d-a5f1-bbedf8a3ef8e', '2026-01-19', '18:00:00', 'MNP Community Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.493243+00', '2025-10-19 18:06:25.493243+00', 2, 1.00, NULL, '1c0553cd-4cc5-4300-859c-6f764454388c', '7768ddd9-a3e0-423b-9f06-2513d1cd5d9f', 'c3244cb2-439b-437c-b13b-80a7220439ef', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('4b0d5a33-481a-4865-a6d4-b2107f6483bc', '2026-01-21', '19:30:00', 'Westside Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.493243+00', '2025-10-19 18:06:25.493243+00', 2, 1.00, NULL, '7768ddd9-a3e0-423b-9f06-2513d1cd5d9f', '69fbccbb-23f0-4c64-98fd-0f9f8f89b3a6', 'c3244cb2-439b-437c-b13b-80a7220439ef', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('89488ec7-2e5b-4c5e-8b09-454d1bf6d17c', '2026-01-23', '18:00:00', 'Cardel Rec South', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.493243+00', '2025-10-19 18:06:25.493243+00', 2, 1.00, NULL, '69fbccbb-23f0-4c64-98fd-0f9f8f89b3a6', '7768ddd9-a3e0-423b-9f06-2513d1cd5d9f', 'c3244cb2-439b-437c-b13b-80a7220439ef', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('935215a8-159f-4e61-a87d-124ddd20c0ae', '2026-01-25', '19:30:00', 'Vivo Recreation Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.493243+00', '2025-10-19 18:06:25.493243+00', 2, 1.00, NULL, '1c0553cd-4cc5-4300-859c-6f764454388c', '69fbccbb-23f0-4c64-98fd-0f9f8f89b3a6', 'c3244cb2-439b-437c-b13b-80a7220439ef', NULL, NULL, NULL, NULL, 'Community');
INSERT INTO public.games VALUES ('9c0a10e2-fc84-4752-aa6d-501298c7962c', '2026-01-27', '18:00:00', 'Genesis Centre', 'T2P 0A8', 'Recreational', 45.00, 'unassigned', '2025-10-19 18:06:25.493243+00', '2025-10-19 18:06:25.493243+00', 2, 1.00, NULL, '69fbccbb-23f0-4c64-98fd-0f9f8f89b3a6', '1c0553cd-4cc5-4300-859c-6f764454388c', 'c3244cb2-439b-437c-b13b-80a7220439ef', NULL, NULL, NULL, NULL, 'Community');


--
-- Data for Name: ai_suggestions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: approval_workflows; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: approval_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: job_positions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: assets; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: asset_checkouts; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: asset_maintenance; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: assignment_patterns; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.audit_logs VALUES (1, NULL, NULL, 'security.suspicious_activity', NULL, NULL, NULL, NULL, '/api/auth/login', 'POST', '70.72.216.251', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', false, 'Internal server error', '{"error_type":"internal_error","status_code":500,"is_operational":false,"query_params":{}}', 'high', '2025-10-19 18:10:02.146+00');
INSERT INTO public.audit_logs VALUES (2, NULL, NULL, 'security.unauthorized_access', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 'Unauthorized CORS request from origin: https://syncedsport.com', '{"origin":"https://syncedsport.com","type":"cors_violation","timestamp":"2025-10-19T18:10:02.144Z"}', 'high', '2025-10-19 18:10:02.144+00');
INSERT INTO public.audit_logs VALUES (3, NULL, NULL, 'security.unauthorized_access', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 'Unauthorized CORS request from origin: https://syncedsport.com', '{"origin":"https://syncedsport.com","type":"cors_violation","timestamp":"2025-10-19T18:10:07.014Z"}', 'high', '2025-10-19 18:10:07.014+00');
INSERT INTO public.audit_logs VALUES (4, NULL, NULL, 'security.suspicious_activity', NULL, NULL, NULL, NULL, '/api/auth/login', 'POST', '70.72.216.251', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', false, 'Internal server error', '{"error_type":"internal_error","status_code":500,"is_operational":false,"query_params":{}}', 'high', '2025-10-19 18:10:07.017+00');
INSERT INTO public.audit_logs VALUES (5, NULL, NULL, 'security.unauthorized_access', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 'Unauthorized CORS request from origin: https://syncedsport.com', '{"origin":"https://syncedsport.com","type":"cors_violation","timestamp":"2025-10-19T18:10:14.735Z"}', 'high', '2025-10-19 18:10:14.735+00');
INSERT INTO public.audit_logs VALUES (6, NULL, NULL, 'security.suspicious_activity', NULL, NULL, NULL, NULL, '/api/auth/login', 'POST', '70.72.216.251', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', false, 'Internal server error', '{"error_type":"internal_error","status_code":500,"is_operational":false,"query_params":{}}', 'high', '2025-10-19 18:10:14.737+00');
INSERT INTO public.audit_logs VALUES (7, NULL, NULL, 'security.suspicious_activity', NULL, NULL, NULL, NULL, '/api/auth/login', 'POST', '70.72.216.251', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', false, 'Internal server error', '{"error_type":"internal_error","status_code":500,"is_operational":false,"query_params":{}}', 'high', '2025-10-19 18:10:27.525+00');
INSERT INTO public.audit_logs VALUES (8, NULL, NULL, 'security.unauthorized_access', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 'Unauthorized CORS request from origin: https://syncedsport.com', '{"origin":"https://syncedsport.com","type":"cors_violation","timestamp":"2025-10-19T18:10:27.524Z"}', 'high', '2025-10-19 18:10:27.524+00');
INSERT INTO public.audit_logs VALUES (9, NULL, NULL, 'security.unauthorized_access', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 'Unauthorized CORS request from origin: https://syncedsport.com', '{"origin":"https://syncedsport.com","type":"cors_violation","timestamp":"2025-10-19T18:48:10.446Z"}', 'high', '2025-10-19 18:48:10.446+00');
INSERT INTO public.audit_logs VALUES (10, NULL, NULL, 'security.suspicious_activity', NULL, NULL, NULL, NULL, '/api/auth/login', 'POST', '70.72.216.251', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', false, 'Internal server error', '{"error_type":"internal_error","status_code":500,"is_operational":false,"query_params":{}}', 'high', '2025-10-19 18:48:10.463+00');
INSERT INTO public.audit_logs VALUES (11, NULL, NULL, 'security.suspicious_activity', NULL, NULL, NULL, NULL, '/api/auth/login', 'POST', '70.72.216.251', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', false, 'Internal server error', '{"error_type":"internal_error","status_code":500,"is_operational":false,"query_params":{}}', 'high', '2025-10-19 18:48:14.359+00');
INSERT INTO public.audit_logs VALUES (12, NULL, NULL, 'security.unauthorized_access', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 'Unauthorized CORS request from origin: https://syncedsport.com', '{"origin":"https://syncedsport.com","type":"cors_violation","timestamp":"2025-10-19T18:48:14.358Z"}', 'high', '2025-10-19 18:48:14.358+00');
INSERT INTO public.audit_logs VALUES (13, '4d24665b-c051-408c-94ba-e1310f1ee12a', 'admin@sportsmanager.com', 'auth.login.success', NULL, NULL, NULL, NULL, NULL, NULL, '70.72.216.251', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', true, NULL, NULL, 'medium', '2025-10-19 18:56:04.198+00');
INSERT INTO public.audit_logs VALUES (14, NULL, NULL, 'security.suspicious_activity', NULL, NULL, NULL, NULL, '/api/resources/categories', 'GET', '70.72.216.251', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', false, 'Route not found', '{"error_type":"not_found_error","status_code":404,"is_operational":true,"query_params":{},"body_params":{}}', 'medium', '2025-10-19 19:28:51.262+00');
INSERT INTO public.audit_logs VALUES (15, NULL, NULL, 'security.suspicious_activity', NULL, NULL, NULL, NULL, '/api/resources', 'GET', '70.72.216.251', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', false, 'Route not found', '{"error_type":"not_found_error","status_code":404,"is_operational":true,"query_params":{},"body_params":{}}', 'medium', '2025-10-19 19:28:51.264+00');
INSERT INTO public.audit_logs VALUES (16, NULL, NULL, 'security.suspicious_activity', NULL, NULL, NULL, NULL, '/api/resources', 'GET', '70.72.216.251', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', false, 'Route not found', '{"error_type":"not_found_error","status_code":404,"is_operational":true,"query_params":{},"body_params":{}}', 'medium', '2025-10-19 19:28:51.336+00');
INSERT INTO public.audit_logs VALUES (17, NULL, NULL, 'security.suspicious_activity', NULL, NULL, NULL, NULL, '/api/resources/categories', 'GET', '70.72.216.251', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', false, 'Route not found', '{"error_type":"not_found_error","status_code":404,"is_operational":true,"query_params":{},"body_params":{}}', 'medium', '2025-10-19 19:28:51.333+00');
INSERT INTO public.audit_logs VALUES (18, NULL, NULL, 'security.suspicious_activity', NULL, NULL, NULL, NULL, '/api/resources', 'GET', '70.72.216.251', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', false, 'Route not found', '{"error_type":"not_found_error","status_code":404,"is_operational":true,"query_params":{},"body_params":{}}', 'medium', '2025-10-19 19:28:51.405+00');
INSERT INTO public.audit_logs VALUES (19, NULL, NULL, 'security.suspicious_activity', NULL, NULL, NULL, NULL, '/api/resources', 'GET', '70.72.216.251', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', false, 'Route not found', '{"error_type":"not_found_error","status_code":404,"is_operational":true,"query_params":{},"body_params":{}}', 'medium', '2025-10-19 19:28:51.471+00');
INSERT INTO public.audit_logs VALUES (20, '4d24665b-c051-408c-94ba-e1310f1ee12a', 'admin@sportsmanager.com', 'auth.login.success', NULL, NULL, NULL, NULL, NULL, NULL, '70.72.216.251', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', true, NULL, NULL, 'medium', '2025-10-19 20:31:17.488+00');
INSERT INTO public.audit_logs VALUES (21, '4d24665b-c051-408c-94ba-e1310f1ee12a', 'admin@sportsmanager.com', 'auth.login.success', NULL, NULL, NULL, NULL, NULL, NULL, '70.72.216.251', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', true, NULL, NULL, 'medium', '2025-10-19 20:52:21.6+00');


--
-- Data for Name: chart_of_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: budget_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: budget_periods; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: budgets; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: budget_alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: budget_allocations; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: budget_approvals; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: budget_forecasts; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: cash_flow_forecasts; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: game_chunks; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: chunk_games; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: internal_communications; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: communication_recipients; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: company_credit_cards; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: compliance_tracking; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: content_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: content_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: content_analytics; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: content_analytics_monthly; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: content_attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: content_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: content_item_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: content_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: content_search_index; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: content_versions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: document_access; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: document_acknowledgments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: document_versions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: employee_evaluations; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: expense_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: payment_methods; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: expense_data; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: expense_approvals; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: expense_reimbursements; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: financial_audit_trail; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: financial_dashboards; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: financial_insights; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: financial_kpis; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: financial_reports_config; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: positions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: game_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: vendors; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: financial_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: game_fees; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: incidents; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: invitations; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: journal_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: journal_entry_lines; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: knex_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.knex_migrations VALUES (1, '001_create_users.js', 1, '2025-10-19 18:05:50.346+00');
INSERT INTO public.knex_migrations VALUES (2, '002_create_positions.js', 1, '2025-10-19 18:05:50.359+00');
INSERT INTO public.knex_migrations VALUES (3, '003_create_referees.js', 1, '2025-10-19 18:05:50.382+00');
INSERT INTO public.knex_migrations VALUES (4, '004_create_teams.js', 1, '2025-10-19 18:05:50.389+00');
INSERT INTO public.knex_migrations VALUES (5, '005_create_games.js', 1, '2025-10-19 18:05:50.413+00');
INSERT INTO public.knex_migrations VALUES (6, '006_create_game_assignments.js', 1, '2025-10-19 18:05:50.45+00');
INSERT INTO public.knex_migrations VALUES (7, '007_create_referee_availability.js', 1, '2025-10-19 18:05:50.468+00');
INSERT INTO public.knex_migrations VALUES (8, '008_create_invitations.js', 1, '2025-10-19 18:05:50.499+00');
INSERT INTO public.knex_migrations VALUES (9, '009_add_refs_needed_to_games.js', 1, '2025-10-19 18:05:50.504+00');
INSERT INTO public.knex_migrations VALUES (10, '010_replace_level_with_wage.js', 1, '2025-10-19 18:05:50.511+00');
INSERT INTO public.knex_migrations VALUES (11, '010_update_assignment_status_constraint.js', 1, '2025-10-19 18:05:50.514+00');
INSERT INTO public.knex_migrations VALUES (12, '011_create_referee_levels.js', 1, '2025-10-19 18:05:50.528+00');
INSERT INTO public.knex_migrations VALUES (13, '012_update_referees_with_levels.js', 1, '2025-10-19 18:05:50.537+00');
INSERT INTO public.knex_migrations VALUES (14, '013_add_wage_multiplier_to_games.js', 1, '2025-10-19 18:05:50.541+00');
INSERT INTO public.knex_migrations VALUES (15, '014_add_calculated_wage_to_assignments.js', 1, '2025-10-19 18:05:50.544+00');
INSERT INTO public.knex_migrations VALUES (16, '015_simplify_to_single_user_id.js', 1, '2025-10-19 18:05:50.588+00');
INSERT INTO public.knex_migrations VALUES (17, '016_update_games_team_structure.js', 1, '2025-10-19 18:05:50.608+00');
INSERT INTO public.knex_migrations VALUES (18, '017_create_leagues.js', 1, '2025-10-19 18:05:50.626+00');
INSERT INTO public.knex_migrations VALUES (19, '018_update_teams_with_leagues.js', 1, '2025-10-19 18:05:50.639+00');
INSERT INTO public.knex_migrations VALUES (20, '019_update_games_with_team_ids.js', 1, '2025-10-19 18:05:50.649+00');
INSERT INTO public.knex_migrations VALUES (21, '020_create_organizations.js', 1, '2025-10-19 18:05:50.666+00');
INSERT INTO public.knex_migrations VALUES (22, '020_migrate_json_teams_to_entities.js', 1, '2025-10-19 18:05:50.675+00');
INSERT INTO public.knex_migrations VALUES (23, '021_finalize_team_structure.js', 1, '2025-10-19 18:05:50.698+00');
INSERT INTO public.knex_migrations VALUES (24, '022_add_user_roles.js', 1, '2025-10-19 18:05:50.703+00');
INSERT INTO public.knex_migrations VALUES (25, '024_create_organization_settings.js', 1, '2025-10-19 18:05:50.71+00');
INSERT INTO public.knex_migrations VALUES (26, '025_add_availability_strategy.js', 1, '2025-10-19 18:05:50.717+00');
INSERT INTO public.knex_migrations VALUES (27, '025_create_posts_system.js', 1, '2025-10-19 18:05:50.788+00');
INSERT INTO public.knex_migrations VALUES (28, '026_add_referee_availability_strategy.js', 1, '2025-10-19 18:05:50.79+00');
INSERT INTO public.knex_migrations VALUES (29, '026_seed_post_categories.js', 1, '2025-10-19 18:05:50.793+00');
INSERT INTO public.knex_migrations VALUES (30, '027_create_ai_suggestions.js', 1, '2025-10-19 18:05:50.827+00');
INSERT INTO public.knex_migrations VALUES (31, '028_create_assignment_patterns.js', 1, '2025-10-19 18:05:50.856+00');
INSERT INTO public.knex_migrations VALUES (32, '029_create_game_chunks.js', 1, '2025-10-19 18:05:50.888+00');
INSERT INTO public.knex_migrations VALUES (33, '030_create_chunk_games.js', 1, '2025-10-19 18:05:50.906+00');
INSERT INTO public.knex_migrations VALUES (34, '031_create_locations_table.js', 1, '2025-10-19 18:05:50.926+00');
INSERT INTO public.knex_migrations VALUES (35, '032_add_cost_fields.js', 1, '2025-10-19 18:05:50.931+00');
INSERT INTO public.knex_migrations VALUES (36, '032_update_games_with_location_id.js', 1, '2025-10-19 18:05:50.938+00');
INSERT INTO public.knex_migrations VALUES (37, '033_add_referee_roles_white_whistle.js', 1, '2025-10-19 18:05:50.94+00');
INSERT INTO public.knex_migrations VALUES (38, '034_add_database_defaults_and_constraints.js', 1, '2025-10-19 18:05:51.02+00');
INSERT INTO public.knex_migrations VALUES (39, '035_create_user_locations.js', 1, '2025-10-19 18:05:51.043+00');
INSERT INTO public.knex_migrations VALUES (40, '036_create_user_location_distances.js', 1, '2025-10-19 18:05:51.077+00');
INSERT INTO public.knex_migrations VALUES (41, '037_create_expense_receipts.js', 1, '2025-10-19 18:05:51.1+00');
INSERT INTO public.knex_migrations VALUES (42, '038_create_expense_categories.js', 1, '2025-10-19 18:05:51.124+00');
INSERT INTO public.knex_migrations VALUES (43, '040_create_expense_data.js', 1, '2025-10-19 18:05:51.155+00');
INSERT INTO public.knex_migrations VALUES (44, '041_create_expense_approvals.js', 1, '2025-10-19 18:05:51.186+00');
INSERT INTO public.knex_migrations VALUES (45, '042_create_ai_processing_logs.js', 1, '2025-10-19 18:05:51.22+00');
INSERT INTO public.knex_migrations VALUES (46, '043_create_budgets_system.js', 1, '2025-10-19 18:05:51.312+00');
INSERT INTO public.knex_migrations VALUES (47, '044_create_financial_tracking_system.js', 1, '2025-10-19 18:05:51.408+00');
INSERT INTO public.knex_migrations VALUES (48, '045_create_accounting_integration_framework.js', 1, '2025-10-19 18:05:51.538+00');
INSERT INTO public.knex_migrations VALUES (49, '046_create_financial_controls_and_analytics.js', 1, '2025-10-19 18:05:51.67+00');
INSERT INTO public.knex_migrations VALUES (50, '047_create_organizational_management_system.js', 1, '2025-10-19 18:05:52.081+00');
INSERT INTO public.knex_migrations VALUES (51, '049_remove_redundant_available_amount.js', 1, '2025-10-19 18:05:52.089+00');
INSERT INTO public.knex_migrations VALUES (52, '050_create_expense_reimbursements.js', 1, '2025-10-19 18:05:52.161+00');
INSERT INTO public.knex_migrations VALUES (53, '051_create_payment_methods.js', 1, '2025-10-19 18:05:52.184+00');
INSERT INTO public.knex_migrations VALUES (54, '052_create_purchase_orders.js', 1, '2025-10-19 18:05:52.227+00');
INSERT INTO public.knex_migrations VALUES (55, '053_create_company_credit_cards.js', 1, '2025-10-19 18:05:52.269+00');
INSERT INTO public.knex_migrations VALUES (56, '054_enhance_expense_data_payment_methods.js', 1, '2025-10-19 18:05:52.333+00');
INSERT INTO public.knex_migrations VALUES (57, '055_enhance_expense_approvals_workflow.js', 1, '2025-10-19 18:05:52.334+00');
INSERT INTO public.knex_migrations VALUES (58, '060_performance_indexes.js', 1, '2025-10-19 18:05:52.395+00');
INSERT INTO public.knex_migrations VALUES (59, '061_query_optimization.js', 1, '2025-10-19 18:05:52.457+00');
INSERT INTO public.knex_migrations VALUES (60, '062_constraint_optimization.js', 1, '2025-10-19 18:05:52.637+00');
INSERT INTO public.knex_migrations VALUES (61, '20250125_add_external_id_to_games.js', 1, '2025-10-19 18:05:52.649+00');
INSERT INTO public.knex_migrations VALUES (62, '20250723024910_add_game_type_to_games.js', 1, '2025-10-19 18:05:52.653+00');
INSERT INTO public.knex_migrations VALUES (63, '20250726062109_create_ai_assignment_rules.js', 1, '2025-10-19 18:05:52.725+00');
INSERT INTO public.knex_migrations VALUES (64, '20250729203841_add_white_whistle_to_users.js', 1, '2025-10-19 18:05:52.728+00');
INSERT INTO public.knex_migrations VALUES (65, '20250729204500_add_performance_indexes.js', 1, '2025-10-19 18:05:52.729+00');
INSERT INTO public.knex_migrations VALUES (66, '20250729223837_create_audit_logs_table.js', 1, '2025-10-19 18:05:52.73+00');
INSERT INTO public.knex_migrations VALUES (67, '20250731_performance_indexes.js', 1, '2025-10-19 18:05:52.731+00');
INSERT INTO public.knex_migrations VALUES (68, '20250801_expense_performance_indexes.js', 1, '2025-10-19 18:05:52.731+00');
INSERT INTO public.knex_migrations VALUES (69, '20250803_add_ai_performance_indexes.js', 1, '2025-10-19 18:05:52.732+00');
INSERT INTO public.knex_migrations VALUES (70, '20250804_implement_new_referee_level_system.js', 1, '2025-10-19 18:05:52.795+00');
INSERT INTO public.knex_migrations VALUES (71, '20250805214140_create_communications_system.js', 1, '2025-10-19 18:05:52.799+00');
INSERT INTO public.knex_migrations VALUES (72, '20250808050529_create_expense_receipts_table.js', 1, '2025-10-19 18:05:52.802+00');
INSERT INTO public.knex_migrations VALUES (73, '20250808052552_create_game_fees.js', 1, '2025-10-19 18:05:52.817+00');
INSERT INTO public.knex_migrations VALUES (74, '20250829_create_content_management_system.js', 1, '2025-10-19 18:05:52.946+00');
INSERT INTO public.knex_migrations VALUES (75, '20250829_create_rbac_system.js', 1, '2025-10-19 18:05:52.998+00');
INSERT INTO public.knex_migrations VALUES (76, '20250829_fix_critical_issues.js', 1, '2025-10-19 18:05:53.027+00');
INSERT INTO public.knex_migrations VALUES (77, '20250829_migrate_users_to_rbac.js', 1, '2025-10-19 18:05:53.034+00');
INSERT INTO public.knex_migrations VALUES (78, '20250830_create_resource_centre_tables.js', 1, '2025-10-19 18:05:53.081+00');
INSERT INTO public.knex_migrations VALUES (79, '20250831000001_create_resource_category_permissions.js', 1, '2025-10-19 18:05:53.099+00');
INSERT INTO public.knex_migrations VALUES (80, '20250831000002_create_resource_permissions.js', 1, '2025-10-19 18:05:53.117+00');
INSERT INTO public.knex_migrations VALUES (81, '20250831000003_create_resource_audit_log.js', 1, '2025-10-19 18:05:53.146+00');
INSERT INTO public.knex_migrations VALUES (82, '20250831000004_create_resource_versions.js', 1, '2025-10-19 18:05:53.166+00');
INSERT INTO public.knex_migrations VALUES (83, '20250831000005_create_resource_category_managers.js', 1, '2025-10-19 18:05:53.193+00');
INSERT INTO public.knex_migrations VALUES (84, '20250831000006_add_resource_rbac_fields.js', 1, '2025-10-19 18:05:53.228+00');
INSERT INTO public.knex_migrations VALUES (85, '20250831000007_insert_resource_permissions.js', 1, '2025-10-19 18:05:53.244+00');
INSERT INTO public.knex_migrations VALUES (86, '20250831185533_remove_legacy_role_column.js', 1, '2025-10-19 18:05:53.248+00');
INSERT INTO public.knex_migrations VALUES (87, '20250831225010_create_mentoring_system.js', 1, '2025-10-19 18:05:53.33+00');
INSERT INTO public.knex_migrations VALUES (88, '20250831_create_rbac_access_tables.js', 1, '2025-10-19 18:05:53.418+00');
INSERT INTO public.knex_migrations VALUES (89, '20250831_create_rbac_registry_tables.js', 1, '2025-10-19 18:05:53.5+00');
INSERT INTO public.knex_migrations VALUES (90, '20250831_enhance_rbac_with_referee_system.js', 1, '2025-10-19 18:05:53.541+00');
INSERT INTO public.knex_migrations VALUES (91, '20250831_seed_referee_roles.js', 1, '2025-10-19 18:05:53.551+00');
INSERT INTO public.knex_migrations VALUES (92, '20250901000001_seed_mentor_rbac_permissions.js', 1, '2025-10-19 18:05:53.583+00');
INSERT INTO public.knex_migrations VALUES (93, '20250901_add_comprehensive_user_fields.js', 1, '2025-10-19 18:05:53.618+00');
INSERT INTO public.knex_migrations VALUES (94, '20250901_add_user_notes_column.js', 1, '2025-10-19 18:05:53.637+00');
INSERT INTO public.knex_migrations VALUES (95, '20250901_add_user_notes_permissions.js', 1, '2025-10-19 18:05:53.645+00');
INSERT INTO public.knex_migrations VALUES (96, '20250902_add_color_to_roles.js', 1, '2025-10-19 18:05:53.648+00');
INSERT INTO public.knex_migrations VALUES (97, '20250902_add_missing_resource_permissions.js', 1, '2025-10-19 18:05:53.649+00');
INSERT INTO public.knex_migrations VALUES (98, '20250902_add_role_advanced_settings.js', 1, '2025-10-19 18:05:53.65+00');
INSERT INTO public.knex_migrations VALUES (99, '20250902_add_role_profile_visibility.js', 1, '2025-10-19 18:05:53.651+00');
INSERT INTO public.knex_migrations VALUES (100, '20250925_assign_referee_permissions.js', 1, '2025-10-19 18:05:53.699+00');
INSERT INTO public.knex_migrations VALUES (101, '20250925_create_referee_permissions.js', 1, '2025-10-19 18:05:53.727+00');
INSERT INTO public.knex_migrations VALUES (102, '20250925_create_referee_roles.js', 1, '2025-10-19 18:05:53.735+00');
INSERT INTO public.knex_migrations VALUES (103, '20250925_migrate_existing_referees.js', 1, '2025-10-19 18:05:53.749+00');
INSERT INTO public.knex_migrations VALUES (104, '20250926_grant_super_admin_full_access.js', 1, '2025-10-19 18:05:53.785+00');
INSERT INTO public.knex_migrations VALUES (105, '20250927000000_drop_legacy_rbac_tables.js', 1, '2025-10-19 18:05:53.803+00');
INSERT INTO public.knex_migrations VALUES (106, '20250928_add_role_code.js', 1, '2025-10-19 18:05:53.823+00');
INSERT INTO public.knex_migrations VALUES (107, '20250928_prepare_multitenancy.js', 1, '2025-10-19 18:05:53.843+00');
INSERT INTO public.knex_migrations VALUES (108, '20250930_add_decline_reasons_to_assignments.js', 1, '2025-10-19 18:05:53.847+00');
INSERT INTO public.knex_migrations VALUES (109, '20250930_add_reminder_sent_at.js', 1, '2025-10-19 18:05:53.851+00');
INSERT INTO public.knex_migrations VALUES (110, '20250930_create_notifications.js', 1, '2025-10-19 18:05:53.886+00');
INSERT INTO public.knex_migrations VALUES (111, '20251018000000_drop_rbac_registry_tables.js', 1, '2025-10-19 18:05:53.928+00');


--
-- Data for Name: knex_migrations_lock; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.knex_migrations_lock VALUES (1, 0);


--
-- Data for Name: mentorships; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: mentorship_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: mentorship_notes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: notification_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: organization_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.organization_settings VALUES ('063abbfe-4f63-4703-a1ce-cf1734186b38', 'Sports Organization', 'INDIVIDUAL', NULL, '2025-10-19 18:05:50.305204+00', '2025-10-19 18:05:50.305204+00', 'BLACKLIST');


--
-- Data for Name: post_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.post_categories VALUES ('a950293b-4387-46e9-ba18-5192e9cf44e7', 'Announcements', 'announcements', 'General announcements and updates', 'Megaphone', '#3b82f6', 1, true, '2025-10-19 18:05:50.305204+00', '2025-10-19 18:05:50.305204+00');
INSERT INTO public.post_categories VALUES ('7eba3810-c86a-4748-8db9-d85ea62d2b29', 'Rules & Regulations', 'rules-regulations', 'Rule changes and regulatory updates', 'BookOpen', '#dc2626', 2, true, '2025-10-19 18:05:50.305204+00', '2025-10-19 18:05:50.305204+00');
INSERT INTO public.post_categories VALUES ('cf20664b-adc0-43ae-8779-5240ee96328d', 'Events', 'events', 'Upcoming events and activities', 'Calendar', '#059669', 3, true, '2025-10-19 18:05:50.305204+00', '2025-10-19 18:05:50.305204+00');
INSERT INTO public.post_categories VALUES ('ea85648d-be46-4731-a2a6-1948dac0044c', 'Training', 'training', 'Training opportunities and resources', 'GraduationCap', '#7c3aed', 4, true, '2025-10-19 18:05:50.305204+00', '2025-10-19 18:05:50.305204+00');
INSERT INTO public.post_categories VALUES ('275bb9f1-90a6-4a55-b691-e2af102fcf98', 'Schedule Changes', 'schedule-changes', 'Game schedule updates and changes', 'Clock', '#ea580c', 5, true, '2025-10-19 18:05:50.305204+00', '2025-10-19 18:05:50.305204+00');
INSERT INTO public.post_categories VALUES ('f92a8f88-70c5-42e4-a56a-8eb057dc681f', 'General', 'general', 'General posts and information', 'Info', '#6b7280', 6, true, '2025-10-19 18:05:50.305204+00', '2025-10-19 18:05:50.305204+00');


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: post_media; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: post_reads; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: referee_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.referee_profiles VALUES ('abaf3118-f3b3-47dc-994a-9ddd28b1c768', 'a7d4ba2d-9a83-4674-8040-c8d03fba7fc2', 45.00, 'CAD', 'direct_deposit', 7, 8.50, NULL, NULL, NULL, 'Teaching', false, 10, NULL, NULL, NULL, NULL, 'Test Teaching referee account', true, '2025-10-19 18:06:25.32388+00', '2025-10-19 18:06:25.32388+00');
INSERT INTO public.referee_profiles VALUES ('995916f6-b39a-469b-98f0-1989dfabeebb', '192eb7c8-37dd-4d73-af47-72b866cbc7da', 35.00, 'CAD', 'direct_deposit', 3, 8.50, NULL, NULL, NULL, 'Growing', false, 10, NULL, NULL, NULL, NULL, 'Test Growing referee account', true, '2025-10-19 18:06:25.424802+00', '2025-10-19 18:06:25.424802+00');


--
-- Data for Name: referee_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.referee_roles VALUES ('b4f21982-6b5c-46ba-9818-127e5210e207', 'Referee', 'Standard referee role for officiating games', true, '{"can_officiate":true,"can_be_assigned":true,"is_default":true}', '2025-10-19 18:05:50.305204+00', '2025-10-19 18:05:50.305204+00');
INSERT INTO public.referee_roles VALUES ('a696eef7-8d61-450a-acf3-09218721e5a5', 'Evaluator', 'Evaluates referee performance during games', true, '{"can_officiate":true,"can_evaluate":true,"can_be_assigned":true,"receives_full_fee":true}', '2025-10-19 18:05:50.305204+00', '2025-10-19 18:05:50.305204+00');
INSERT INTO public.referee_roles VALUES ('70cea794-a287-4305-a243-8be966e60204', 'Mentor', 'Mentors new and developing referees', true, '{"can_officiate":true,"can_mentor":true,"can_be_assigned":true,"receives_full_fee":true}', '2025-10-19 18:05:50.305204+00', '2025-10-19 18:05:50.305204+00');
INSERT INTO public.referee_roles VALUES ('871865bf-3214-4fc5-902d-5659f4baee02', 'Regional Lead', 'Regional leadership and coordination role', true, '{"can_officiate":true,"can_assign":true,"can_coordinate":true,"has_admin_access":true}', '2025-10-19 18:05:50.305204+00', '2025-10-19 18:05:50.305204+00');
INSERT INTO public.referee_roles VALUES ('ebfced3b-9594-4d62-a40a-9c8747b2f14e', 'Assignor', 'Assigns referees to games', true, '{"can_assign":true,"can_view_all_games":true,"has_scheduling_access":true}', '2025-10-19 18:05:50.305204+00', '2025-10-19 18:05:50.305204+00');
INSERT INTO public.referee_roles VALUES ('401085ba-5b78-4076-b65b-272305ced505', 'Inspector', 'Inspects and audits referee performance', true, '{"can_inspect":true,"can_audit":true,"can_evaluate":true,"receives_full_fee":true}', '2025-10-19 18:05:50.305204+00', '2025-10-19 18:05:50.305204+00');


--
-- Data for Name: resource_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: resources; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: resource_access_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: resource_audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: resource_category_managers; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: resource_category_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: resource_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: resource_versions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: risk_assessments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: role_api_access; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: role_data_scopes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: role_features; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: role_page_access; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: spending_limits; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: training_records; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_earnings; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_location_distances; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_locations; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_referee_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.user_roles VALUES ('7f0d9f6f-0cf9-47c9-bba7-0b78cf98839c', '4d24665b-c051-408c-94ba-e1310f1ee12a', 'ba818921-487e-4969-acd1-e79a5b463df9', '2025-10-19 18:06:24.953+00', '4d24665b-c051-408c-94ba-e1310f1ee12a', NULL, true);
INSERT INTO public.user_roles VALUES ('5fc04804-35d7-4b56-af8c-620925d95c52', 'd9149bb0-bbe1-485d-95e4-a3e69bfc88d1', '7ac7ab11-350b-4404-aa1b-923b9a6b1738', '2025-10-19 18:06:25.049+00', 'd9149bb0-bbe1-485d-95e4-a3e69bfc88d1', NULL, true);
INSERT INTO public.user_roles VALUES ('40c94e11-9eab-422e-a218-8fc7f91adcbf', 'cc99df77-83fa-4bfb-ab2b-9a1b999e9134', '961c280d-b0c5-421f-b63b-58a7e1c26b14', '2025-10-19 18:06:25.14+00', 'cc99df77-83fa-4bfb-ab2b-9a1b999e9134', NULL, true);
INSERT INTO public.user_roles VALUES ('07d323c5-4033-4dea-b22c-b5c16890baea', 'e89ec126-eb96-4ffd-b38b-8890f839465d', 'ab992b5f-d5be-46bd-a0f6-fdcb9b1e173e', '2025-10-19 18:06:25.23+00', 'e89ec126-eb96-4ffd-b38b-8890f839465d', NULL, true);
INSERT INTO public.user_roles VALUES ('244487ec-ed91-46e5-9c24-69da45a91556', 'a7d4ba2d-9a83-4674-8040-c8d03fba7fc2', '26913c2d-5a95-48ef-868a-03e68809e3ce', '2025-10-19 18:06:25.321+00', 'a7d4ba2d-9a83-4674-8040-c8d03fba7fc2', NULL, true);
INSERT INTO public.user_roles VALUES ('c9e1d8d2-a184-4dfd-9547-eb57c662701c', '192eb7c8-37dd-4d73-af47-72b866cbc7da', 'b0072d8c-e230-4f07-9b9f-98d11a3c63b0', '2025-10-19 18:06:25.423+00', '192eb7c8-37dd-4d73-af47-72b866cbc7da', NULL, true);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 21, true);


--
-- Name: content_analytics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.content_analytics_id_seq', 1, false);


--
-- Name: content_analytics_monthly_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.content_analytics_monthly_id_seq', 1, false);


--
-- Name: content_attachments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.content_attachments_id_seq', 1, false);


--
-- Name: content_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.content_categories_id_seq', 1, false);


--
-- Name: content_item_tags_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.content_item_tags_id_seq', 1, false);


--
-- Name: content_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.content_items_id_seq', 1, false);


--
-- Name: content_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.content_permissions_id_seq', 1, false);


--
-- Name: content_tags_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.content_tags_id_seq', 1, false);


--
-- Name: content_versions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.content_versions_id_seq', 1, false);


--
-- Name: knex_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.knex_migrations_id_seq', 111, true);


--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.knex_migrations_lock_index_seq', 1, true);


--
-- PostgreSQL database dump complete
--

\unrestrict baskJE5H1LxnDxl1fdAMVgwsFTrCu3DCgu3cD6wG600iqVsWDi0bfRjmNdjR5Kc

