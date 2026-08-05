import { Link } from "react-router-dom";
import { NavHeader } from "../components/figma/dyve/NavHeader";

type LegalPageProps = { kind: "terms" | "privacy" };

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-2">
    <h2 className="text-base font-bold text-[var(--color-ink)]">{title}</h2>
    <div className="space-y-2 text-sm leading-6 text-[var(--color-muted)]">{children}</div>
  </section>
);

export function LegalPage({ kind }: LegalPageProps) {
  const isTerms = kind === "terms";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <NavHeader title={isTerms ? "이용약관" : "개인정보처리방침"} />
      <main className="min-h-0 flex-1 overflow-y-auto px-5 pb-28 pt-6">
        <div className="space-y-8">
          <header>
            <h1 className="ty-section-title">{isTerms ? "DYVE 이용약관" : "DYVE 개인정보처리방침"}</h1>
            <p className="mt-2 text-sm text-[var(--color-muted)]">시행일: 2026년 7월 27일</p>
          </header>

          {isTerms ? (
            <>
              <Section title="1. 목적과 적용">
                <p>이 약관은 스튜디오 다이브(이하 "DYVE")가 제공하는 공연 탐색, 예매, 결제, 티켓, 공연 관계자 연결 및 부가 서비스의 이용 조건을 정합니다.</p>
                <p>개별 공연이나 거래 화면에 별도 조건이 표시된 경우 해당 조건이 함께 적용됩니다.</p>
              </Section>
              <Section title="2. 회원 계정">
                <p>회원은 정확한 정보를 제공하고 계정과 인증수단을 안전하게 관리해야 합니다. 타인의 정보를 이용하거나 계정을 양도할 수 없습니다.</p>
                <p>회원은 서비스 내 문의를 통해 계정 정보의 정정이나 이용계약 해지를 요청할 수 있습니다.</p>
              </Section>
              <Section title="3. 공연 정보와 거래 당사자">
                <p>공연 주최자 또는 판매자는 공연 내용, 일정, 좌석, 가격과 취소 조건을 정확하게 등록해야 합니다. DYVE가 통신판매중개자로 표시된 거래에서는 해당 판매자가 거래의 당사자입니다.</p>
                <p>판매자 정보와 개별 거래 조건은 결제 전 화면에 표시합니다.</p>
              </Section>
              <Section title="4. 예매와 결제">
                <p>결제 완료 안내가 표시되면 예매가 성립합니다. 좌석 중복, 가격 오류, 결제기관 장애 등으로 정상 이행이 어려운 경우 결제를 취소하고 지체 없이 알립니다.</p>
                <p>결제 처리는 NICEPAY 등 결제대행사를 통해 이루어지며, 결제수단별 이용 조건은 해당 결제대행사의 정책을 따를 수 있습니다.</p>
              </Section>
              <Section title="5. 취소와 환불">
                <p>개별 공연에 별도 환불 조건이 없으면 공연일 기준 7일 전까지 수수료 없이 환불하고, 5~6일 전 10%, 3~4일 전 20%, 1~2일 전 30%, 공연 당일 50%의 취소 수수료를 공제합니다.</p>
                <p>공연이 취소되거나 판매자의 귀책으로 제공되지 못한 경우에는 결제금액 전액을 환불합니다. 실제 입금 시점은 결제수단과 금융기관 사정에 따라 달라질 수 있습니다.</p>
              </Section>
              <Section title="6. 금지행위와 이용 제한">
                <p>회원은 부정 결제, 티켓 위조·불법 재판매, 타인 사칭, 서비스 방해, 권리 침해 또는 법령 위반 행위를 해서는 안 됩니다. 필요한 경우 사전 통지 후 이용을 제한할 수 있으며, 긴급한 피해 방지를 위해 먼저 제한한 뒤 알릴 수 있습니다.</p>
              </Section>
              <Section title="7. 게시물과 권리">
                <p>회원이 등록한 콘텐츠의 권리는 회원에게 있습니다. 회원은 서비스 운영과 노출에 필요한 범위에서 DYVE가 해당 콘텐츠를 이용할 수 있도록 허락하며, 삭제 시 이용을 중단합니다. 법령상 보존 의무가 있는 경우는 예외입니다.</p>
              </Section>
              <Section title="8. 서비스 변경과 책임">
                <p>점검, 재난, 통신 장애 등 불가피한 사유로 서비스를 변경하거나 일시 중단할 수 있습니다. DYVE는 고의 또는 과실이 없는 사유로 발생한 손해에 책임을 지지 않으며, 법령상 소비자 권리를 제한하지 않습니다.</p>
              </Section>
              <Section title="9. 약관 변경과 분쟁">
                <p>약관을 변경할 때에는 시행일과 변경 사유를 서비스에 미리 알립니다. 분쟁은 상호 협의하여 해결하고, 해결되지 않으면 대한민국 법령과 민사소송법상 관할법원에 따릅니다.</p>
              </Section>
            </>
          ) : (
            <>
              <Section title="1. 처리 목적과 항목">
                <p>스튜디오 다이브(이하 "DYVE")는 회원 식별과 로그인, 공연·프로필 운영, 예매·결제·환불, 티켓 발급, 고객 문의, 부정 이용 방지와 서비스 개선을 위해 필요한 개인정보를 처리합니다.</p>
                <p>처리 항목에는 소셜 로그인 식별자, 이메일, 휴대전화번호, 닉네임, 프로필 이미지, 선호 지역, 예매·결제·환불 내역, 문의 및 채팅 내용, 접속기록과 기기·브라우저 정보가 포함될 수 있습니다.</p>
                <p>아티스트·베뉴·주최자 기능 이용 시 활동 정보, 연락처, 주소, 정산 및 사업자 증빙자료를 추가로 처리할 수 있습니다.</p>
              </Section>
              <Section title="2. 카카오 로그인으로 수집하는 정보">
                <p>DYVE는 카카오 로그인을 이용한 회원가입 시 카카오로부터 아래 정보를 제공받습니다.</p>
                <p><strong className="text-[var(--color-ink)]">필수 항목:</strong> 앱별 회원 식별자, 이름, 성별, 연령대, 출생연도, 카카오계정 전화번호. 닉네임, 프로필 이미지, 카카오계정 이메일은 카카오 앱에 설정된 동의 단계에 따라 제공받습니다.</p>
                <p><strong className="text-[var(--color-ink)]">선택 항목:</strong> 생일, CI(연계정보)와 CI 발급시각, 배송지정보(수령인명, 주소, 전화번호, 우편번호).</p>
                <p>회원 식별자와 이름은 계정 생성과 회원 확인, 성별·연령대·출생연도·생일은 Buddy Dive 신청 정보와 나이 확인, 전화번호와 이메일은 계정·예매 관련 연락, CI는 중복 계정 및 회원 식별, 배송지정보는 수령 및 배송 처리에 사용합니다.</p>
                <p>선택 항목에 동의하지 않아도 카카오 로그인과 DYVE 회원가입을 이용할 수 있습니다.</p>
              </Section>
              <Section title="3. 보유 기간">
                <p>회원 정보는 이용계약 종료 시까지, 거래 및 분쟁 처리 정보는 목적 달성 시까지 보관한 뒤 파기합니다. 다만 관계 법령에 따라 계약·청약철회·대금결제 및 공급 기록은 5년, 소비자 불만·분쟁 처리 기록은 3년, 표시·광고 기록은 6개월 동안 보관합니다.</p>
                <p>카카오에서 제공받은 필수·선택 정보는 회원 탈퇴 또는 해당 동의 철회 시까지 보관하며, 배송지정보는 배송 목적 달성 또는 동의 철회 시 지체 없이 파기합니다. 법령상 보존 의무가 있는 경우에는 해당 기간 동안 분리 보관합니다.</p>
              </Section>
              <Section title="4. 제3자 제공과 처리위탁">
                <p>DYVE는 동의 또는 법령상 근거가 있는 경우를 제외하고 개인정보를 제3자에게 제공하지 않습니다. 결제 처리와 환불을 위해 결제 관련 정보를 NICEPAY에 위탁할 수 있으며, 수탁자는 위탁 목적 범위에서만 처리합니다.</p>
              </Section>
              <Section title="5. 정보주체의 권리">
                <p>이용자는 개인정보의 열람, 정정, 삭제, 처리정지와 동의 철회를 요청할 수 있습니다. 서비스 내 문의하기를 통해 요청하면 본인 확인 후 관계 법령에 따라 처리합니다.</p>
              </Section>
              <Section title="6. 파기와 보호조치">
                <p>보유 기간이 끝난 전자적 정보는 복구하기 어려운 방법으로 삭제하고, 종이 문서는 분쇄 또는 소각합니다. 접근권한 관리, 전송구간 보호, 접속기록 관리 등 필요한 안전성 확보조치를 적용합니다.</p>
              </Section>
              <Section title="7. 자동 수집 정보">
                <p>로그인 유지, 보안과 이용환경 개선을 위해 쿠키 또는 브라우저 저장소를 사용할 수 있습니다. 이용자는 브라우저 설정에서 저장을 제한할 수 있으나 일부 기능이 정상 작동하지 않을 수 있습니다.</p>
              </Section>
              <Section title="8. 개인정보 보호 문의">
                <p>개인정보 보호 담당부서는 DYVE 운영팀입니다. 개인정보 관련 요청과 불만은 <a className="underline" href="mailto:teamstudiodive@nate.com">teamstudiodive@nate.com</a> 또는 서비스 내 문의하기로 접수할 수 있습니다.</p>
              </Section>
              <Section title="9. 방침 변경">
                <p>이 방침의 내용이 변경되면 시행일 전에 서비스에서 알립니다. 중요한 변경은 이용자가 알아보기 쉬운 방법으로 별도 안내합니다.</p>
              </Section>
            </>
          )}

          <div className="flex gap-4 border-t border-[var(--color-hairline)] pt-5 text-sm font-semibold">
            <Link className="text-[var(--color-primary)]" to={isTerms ? "/privacy" : "/terms"}>
              {isTerms ? "개인정보처리방침" : "이용약관"}
            </Link>
            <Link className="text-[var(--color-muted)]" to="/inquiries/new">문의하기</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
