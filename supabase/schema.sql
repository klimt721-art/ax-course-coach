-- Supabase SQL Editor에서 실행. 컬럼명은 data/*.csv 헤더와 동일합니다.
create table if not exists public.topics (
  topic_id text primary key,
  title text not null,
  learning_objective text not null,
  difficulty text not null
);
create table if not exists public.materials (
  material_id text primary key,
  topic_id text not null references public.topics(topic_id),
  sort_order int not null,
  content text not null,
  example text
);
create table if not exists public.questions (
  question_id text primary key,
  topic_id text not null references public.topics(topic_id),
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option text not null check (correct_option in ('A','B','C','D')),
  explanation text not null
);
create table if not exists public.feedback_rules (
  rule_id text primary key,
  min_score int not null,
  max_score int not null,
  feedback text not null,
  next_step text not null
);

-- 학습자(anon)는 읽기만 가능. 쓰기 정책은 만들지 않으므로 anon 키로는 수정할 수 없습니다.
alter table public.topics enable row level security;
alter table public.materials enable row level security;
alter table public.questions enable row level security;
alter table public.feedback_rules enable row level security;

-- 프로젝트 생성 시 "새 테이블에 API 권한 자동 부여"를 껐다면 아래 읽기(SELECT) 권한이 필요합니다.
grant usage on schema public to anon;
grant select on public.topics, public.materials, public.questions, public.feedback_rules to anon;

create policy "anon read topics" on public.topics for select to anon using (true);
create policy "anon read materials" on public.materials for select to anon using (true);
create policy "anon read questions" on public.questions for select to anon using (true);
create policy "anon read feedback_rules" on public.feedback_rules for select to anon using (true);

-- 데이터 넣기: Table Editor > Import data from CSV 로 data/ 폴더의 CSV 4개를 가져오세요.
