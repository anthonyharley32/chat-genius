-- 1. Create test users
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'eliot@example.com', 
    '{"username": "eliot.muntz", "full_name": "Eliot Muntz", "display_name": "Eliot"}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'seth@example.com',
    '{"username": "seth.alton", "full_name": "Seth Alton", "display_name": "Seth"}'::jsonb),
  ('33333333-3333-3333-3333-333333333333', 'jay@example.com',
    '{"username": "jay.bezon", "full_name": "Jay Bezon", "display_name": "Jay"}'::jsonb);

-- 2. Create timestamp helper function
CREATE OR REPLACE FUNCTION generate_timestamp(message_number integer)
RETURNS timestamptz AS $$
BEGIN
  RETURN NOW() - interval '1 day' + (message_number * interval '5 minutes');
END;
$$ LANGUAGE plpgsql;

-- 3. Insert messages for #general channel
WITH messages_data AS (
  SELECT * FROM (VALUES
    (1, '11111111-1111-1111-1111-111111111111', 'Morning, team! Did everyone see the headlines about our reusable rockets? Feels like 2015 all over again.'),
    (2, '22222222-2222-2222-2222-222222222222', 'Congrats, Eliot! Was that the same rocket that reduced launch costs by 60% or a new model?'),
    (3, '33333333-3333-3333-3333-333333333333', 'I read about it! My own rocket tests hit a 70% success rate back in 2012, so it''s great to see your progress.'),
    (4, '11111111-1111-1111-1111-111111111111', 'Thanks, Jay. We''re pushing closer to a 75% success rate now. The 2015 milestone really got us off the ground—pun intended.'),
    (5, '22222222-2222-2222-2222-222222222222', 'Speaking of breakthroughs, I''m running new AI models with over 300 million parameters. Hoping to optimize rocket telemetry data for you both.'),
    (6, '33333333-3333-3333-3333-333333333333', 'That''s massive, Seth. Didn''t you have a 300 million-parameter model in 2017 as well?'),
    (7, '22222222-2222-2222-2222-222222222222', 'Yes, we''re refining that original architecture. This new iteration is more efficient and might help you reduce rocket turnaround time by 15%.'),
    (8, '11111111-1111-1111-1111-111111111111', 'That''s huge. I''ll have my aerospace team try it out. We''re always looking for better analytics.'),
    (9, '33333333-3333-3333-3333-333333333333', 'Between Eliot''s single-charge EV and my e-commerce platform, I feel like the last decade has flown by. Remember your first big EV delivery milestone in 2008, Eliot?'),
    (10, '11111111-1111-1111-1111-111111111111', 'Hah, yeah—25,000 units shipped globally that year. I still can''t believe we managed it after nearly going bankrupt in 2007.'),
    (11, '22222222-2222-2222-2222-222222222222', 'You pulled through though. Similar story for me in 2014 when I scraped together $20 million to start my AI research facility.'),
    (12, '33333333-3333-3333-3333-333333333333', 'We''ve all had close calls. I launched my online marketplace in 1995, sold around 2,000 books that first month. Nobody believed it would become a $5 billion revenue machine by 2003.'),
    (13, '11111111-1111-1111-1111-111111111111', 'Jay, it was definitely a wild ride for you. 25 million registered users by 2003? That''s insane growth.'),
    (14, '22222222-2222-2222-2222-222222222222', 'Jay, do you still track the user growth month by month, or is it all AI-driven analytics now?'),
    (15, '33333333-3333-3333-3333-333333333333', 'Oh, mostly AI-driven these days. Over 2,500 companies are using some part of Seth''s toolkits to enhance forecasting, including us.'),
    (16, '22222222-2222-2222-2222-222222222222', 'Yes! That''s part of the 2,500 businesses that implemented our AI solutions. It''s a big chunk of the 45% average innovation boost we''ve recorded.'),
    (17, '11111111-1111-1111-1111-111111111111', 'What''s next for your lab, Seth? Another round of funding after that $400 million infusion in 2020?'),
    (18, '22222222-2222-2222-2222-222222222222', 'Potentially. We''re exploring a new series that could double the number of parameters to 600 million. But we''ll see.'),
    (19, '33333333-3333-3333-3333-333333333333', 'That''s incredible. Where do you even store all that training data?'),
    (20, '22222222-2222-2222-2222-222222222222', 'We''ve got data centers popping up in multiple states now. We''re focusing on renewable energy sources to power them.'),
    (21, '11111111-1111-1111-1111-111111111111', 'Jay, any updates on suborbital flights? Last I heard, you had 100 participants pay $200,000 each by 2019.'),
    (22, '33333333-3333-3333-3333-333333333333', 'We''re at 130 paying passengers now. The next flight is scheduled for Q2. We''re hoping to push that 70% success rate closer to 80%.'),
    (23, '22222222-2222-2222-2222-222222222222', 'And all the data from those flights—do you record it for machine learning analysis?'),
    (24, '33333333-3333-3333-3333-333333333333', 'Absolutely. We feed it into a collaborative project with Seth''s lab. It''s helping us optimize fuel consumption.'),
    (25, '11111111-1111-1111-1111-111111111111', 'Let me know if I can help on the power side. We recently updated the EV battery tech and might adapt some concepts for rocket power systems.')
  ) AS t(msg_order, user_id, content)
)
INSERT INTO messages (
  id,
  content,
  user_id,
  channel_id,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  content,
  user_id::uuid,
  (SELECT id FROM channels WHERE workspace_id = '00000000-0000-0000-0000-000000000000' AND name = 'general'),
  generate_timestamp(msg_order),
  generate_timestamp(msg_order)
FROM messages_data;

-- 4. Insert messages for #random channel
WITH messages_data AS (
  SELECT * FROM (VALUES
    (26, '22222222-2222-2222-2222-222222222222', 'Cross-pollination of ideas is what drives innovation. Eliot, your success in 2015 with that reusable rocket was a game-changer for all of us.'),
    (27, '11111111-1111-1111-1111-111111111111', 'I still get flashbacks to the day we landed that rocket on the floating barge. The entire world was watching.'),
    (28, '33333333-3333-3333-3333-333333333333', 'I remember. The entire team at my rocket division was cheering. We realized then that competition only pushes us further.'),
    (29, '22222222-2222-2222-2222-222222222222', 'Exactly. Innovation thrives with a bit of rivalry. My lab saw a surge in requests for AI-based rocket guidance after that event.'),
    (30, '11111111-1111-1111-1111-111111111111', 'Any of you have new breakthroughs you want to share with the group before we do next quarter''s investor calls?'),
    (31, '33333333-3333-3333-3333-333333333333', 'We''re trying out a new e-commerce drone delivery system. Hoping to cut shipping costs by 40%.'),
    (32, '22222222-2222-2222-2222-222222222222', 'That''s interesting. We could tweak our route-optimization algorithms for you. We''re seeing a 20% improvement in test cases.'),
    (33, '11111111-1111-1111-1111-111111111111', 'I love it. Let''s get some synergy going. Also, I''m planning a Mars simulation event in the Nevada desert this summer.'),
    (34, '33333333-3333-3333-3333-333333333333', 'Count me in. Maybe I''ll invest a fraction of the $5 billion annual revenue from the early 2000s to sponsor the event.'),
    (35, '22222222-2222-2222-2222-222222222222', 'Just make sure to feed me data! I want to build an AI that can handle potential Mars base logistics.'),
    (36, '11111111-1111-1111-1111-111111111111', 'Will do. Our next big project is a rocket that can handle 20% more payload. That might come in handy for your cargo, Jay.'),
    (37, '33333333-3333-3333-3333-333333333333', 'Definitely. We''re shipping everything from satellites to science experiments these days.'),
    (38, '22222222-2222-2222-2222-222222222222', 'I''m still amazed how far we''ve come since 1995, Jay. Only 2,000 books sold in your first month.'),
    (39, '33333333-3333-3333-3333-333333333333', 'Yep, humble beginnings. Now we handle millions of items daily.'),
    (40, '11111111-1111-1111-1111-111111111111', 'Remember when I put $180 million into that rocket startup in 2002? People thought I was throwing money away.'),
    (41, '22222222-2222-2222-2222-222222222222', 'They don''t think that now, seeing as you led the industry to a 60% reduction in launch costs.'),
    (42, '33333333-3333-3333-3333-333333333333', 'I wish I''d jumped in on that rocket investment earlier, Eliot. Could have saved me some R&D time.'),
    (43, '22222222-2222-2222-2222-222222222222', 'Hindsight is 20/20, Jay. But your marketplace''s $5 billion annual revenue by 2003 was no small feat.'),
    (44, '11111111-1111-1111-1111-111111111111', 'No joke. That was a crazy time. Meanwhile, I was scrambling to manufacture more EVs before the battery supply ran out.'),
    (45, '33333333-3333-3333-3333-333333333333', 'So, how many EV units are you aiming for this year, Eliot?'),
    (46, '11111111-1111-1111-1111-111111111111', 'We''re targeting 1 million units globally. A big jump from 25,000 in 2008.'),
    (47, '22222222-2222-2222-2222-222222222222', 'That''s incredible growth. I recall your near-bankruptcy days—definitely a testament to persistence.'),
    (48, '11111111-1111-1111-1111-111111111111', 'Persistence and a bit of luck. Also, an amazing engineering team.'),
    (49, '33333333-3333-3333-3333-333333333333', 'Seth, any new AI breakthroughs we should know about for our next board meeting?'),
    (50, '22222222-2222-2222-2222-222222222222', 'We''re testing a model that can handle 600 million parameters, doubling our 2017 milestone. Could drastically improve voice recognition.'),
    (51, '11111111-1111-1111-1111-111111111111', 'That could be game-changing for in-car voice controls. Let''s chat offline.'),
    (52, '33333333-3333-3333-3333-333333333333', 'I might integrate that in my e-commerce platform to help customers find items faster.'),
    (53, '22222222-2222-2222-2222-222222222222', 'Absolutely. I''ll schedule a joint dev session for next week.')
  ) AS t(msg_order, user_id, content)
)
INSERT INTO messages (
  id,
  content,
  user_id,
  channel_id,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  content,
  user_id::uuid,
  (SELECT id FROM channels WHERE workspace_id = '00000000-0000-0000-0000-000000000000' AND name = 'random'),
  generate_timestamp(msg_order),
  generate_timestamp(msg_order)
FROM messages_data;

-- 5. Clean up
DROP FUNCTION IF EXISTS generate_timestamp;

UPDATE public.users
SET avatar_url = CASE
    WHEN id = '11111111-1111-1111-1111-111111111111' THEN 'avatars/eliot-muntz.jpg'
    WHEN id = '22222222-2222-2222-2222-222222222222' THEN 'avatars/seth-alton.jpg'
    WHEN id = '33333333-3333-3333-3333-333333333333' THEN 'avatars/jay-bezon.jpg'
END
WHERE id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
);