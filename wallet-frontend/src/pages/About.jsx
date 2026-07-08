import { useState, useEffect, useRef } from "react";
import { 
  Home, Briefcase, User, Mail, GraduationCap, 
  Award, Target, BarChart2, RefreshCw, BookOpen, 
  TrendingUp, Star, ArrowDownRight, ExternalLink
} from "lucide-react";
import Navbar from "../components/Navbar";
import { useLanguage } from "../context/LanguageContext";

// Beautiful custom Canvas Torus Knot wireframe animation (pure Canvas 2D)
const CanvasTorusKnot = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId;
    let angleX = 0;
    let angleY = 0;

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Torus knot equations parameters
    const p = 2;
    const q = 3;
    const r = 8; // Major radius
    const a = 3; // Minor radius
    const numPoints = 240;

    const points = [];
    for (let i = 0; i <= numPoints; i++) {
      const phi = (i / numPoints) * Math.PI * 2 * p;
      const x = (r + a * Math.cos(q * phi)) * Math.cos(p * phi);
      const y = (r + a * Math.cos(q * phi)) * Math.sin(p * phi);
      const z = a * Math.sin(q * phi);
      points.push({ x, y, z });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const scale = Math.min(canvas.width, canvas.height) / 32;

      angleX += 0.003;
      angleY += 0.003;

      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);

      ctx.beginPath();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
      ctx.lineWidth = 1.2;

      const projectedPoints = points.map((p) => {
        // Rotate Y
        let x1 = p.x * cosY - p.z * sinY;
        let z1 = p.x * sinY + p.z * cosY;

        // Rotate X
        let y2 = p.y * cosX - z1 * sinX;
        let z2 = p.y * sinX + z1 * cosX;

        // Perspective projection
        const distance = 40;
        const perspective = distance / (distance + z2);
        
        return {
          x: cx + x1 * scale * perspective,
          y: cy + y2 * scale * perspective,
          z: z2
        };
      });

      for (let i = 0; i < projectedPoints.length - 1; i++) {
        const p1 = projectedPoints[i];
        const p2 = projectedPoints[i + 1];
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      }
      ctx.stroke();

      // Render glowing yellow sparks on the knot
      projectedPoints.forEach((p, idx) => {
        if (idx % 12 === 0) {
          ctx.beginPath();
          ctx.fillStyle = "rgba(212, 175, 55, 0.75)";
          ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full block pointer-events-none absolute inset-0" />;
};

export default function About() {
  const { lang, toggleLang, t } = useLanguage();
  const [activeSection, setActiveSection] = useState("hero");

  useEffect(() => {
    const handleScroll = () => {
      const sections = ["hero", "qua-trinh", "dac-diem", "du-an", "gia-tri", "lien-he"];
      const scrollPos = window.scrollY + 250;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const top = element.offsetTop;
          const height = element.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id) => {
    if (id === "hero") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setActiveSection("hero");
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setActiveSection(id);
    }
  };

  // Translations matching exact wording of target templates in both EN and VI
  // Completely removed all occurrences of TechCorp
  const info = {
    vi: {
      role: "Product Developer & Growth Strategist",
      description: "Chuyên viên phát triển sản phẩm. Xây dựng chiến lược sản phẩm, tối ưu hóa quy trình phát triển và thúc đẩy tăng trưởng bền vững thông qua dữ liệu và công nghệ hiện đại.",
      explore: "Khám phá",
      journey: "Hành trình",
      journeyTitle: "Quá trình học tập & làm việc",
      journeySub: "Một hành trình liên tục học hỏi, phát triển và tạo ra giá trị trong lĩnh vực phát triển sản phẩm.",
      journeyCards: [
        {
          title: "Sinh viên FPT Academy TP. Hồ Chí Minh",
          time: "Đang học",
          type: "Học tập",
          concept: "Development & Design",
          desc: "Vừa biết lập trình, vừa có tư duy thiết kế để tạo ra những sản phẩm đẹp, dễ sử dụng và giải quyết được nhu cầu thực tế của người dùng"
        },
        {
          title: "Vietnam",
          time: "2026 - Hiện tại",
          type: "Sự nghiệp",
          concept: "Chuyên viên Phát triển Sản phẩm",
          desc: "biến những ý tưởng thành sản phẩm thật. Từ việc thiết kế giao diện đến lập trình chức năng, hiểu rõ quy trình phát triển một ứng dụng hoàn chỉnh"
        },
        {
          title: "Chứng chỉ & Thành tựu",
          time: "Liên tục cập nhật",
          type: "Phát triển",
          concept: "Học tập suốt đời",
          desc: "Sở hữu chứng chỉ PMP, Agile Certified Practitioner và Google Analytics. Diễn giả tại 5 hội thảo công nghệ quốc gia, xuất bản 3 bài nghiên cứu trên tạp chí chuyên ngành. Liên tục tham gia các khóa học về AI, Data Science và Quản lý sản phẩm hiện đại."
        }
      ],
      services: "Dịch vụ",
      expertiseTitle: "Chuyên môn nổi bật",
      expertiseSub: "Chiến lược, phân tích và phát triển — được thực thi như những giải pháp toàn diện và hiệu quả.",
      expertises: [
        {
          title: "Chiến lược sản phẩm",
          type: "Strategy",
          desc: "Xây dựng lộ trình sản phẩm rõ ràng, từ logic tới cái nhìn thịhiếu của người dùng"
        },
        {
          title: "Phân tích & Tối ưu",
          type: "Analytics",
          desc: "Sử dụng dữ liệu người dùng và phân tích số liệu để đưa ra quyết định sản phẩm chính xác, giảm thiểu rủi ro và tối đa hóa lựa chọn"
        },
        {
          title: "Vòng đời sản phẩm",
          type: "Lifecycle",
          desc: "Điều phối toàn bộ vòng đời sản phẩm từ ý tưởng, phát triển, ra mắt đến mở rộng thị trường thay đổi hợp với xu hướng người dùng."
        }
      ],
      projectEyebrow: "Hồ sơ dự án",
      projectTitle: "Dự Án Tiêu Biểu",
      projectSub: "Mỗi dự án là một hành trình từ nghiên cứu, thiết kế đến phát triển và tối ưu, mang lại giá trị cụ thể cho người dùng và doanh nghiệp.",
      projects: [
        {
          title: "TECHWIZ MÙA 6 – 2025 Responsive NextGen Website Development",
          time: "2025 - 6 tháng",
          desc: "Nền tảng Chăm Sóc Thú Cưng là giải pháp trực tuyến giúp người nuôi quản lý và chăm sóc thú cưng một cách thuận tiện, nhanh chóng và hiệu quả. Nền tảng kết nối người dùng với các dịch vụ chăm sóc thú cưng, đồng thời cung cấp những kiến thức hữu ích để đảm bảo sức khỏe và sự phát triển toàn diện cho thú cưng",
          features: "Hệ thống xử lý luồng dữ liệu lớn với độ trễ dưới 2 giây, tích hợp thuật toán phát hiện bất thường và bảng điều khiển tùy chỉnh cao.",
          processTitle: "Quy Trình Thực Hiện-72 Hours"
        },
        {
          title: "MediCare -nền tảng quản lý bệnh viện",
          time: "2025 - 6 tháng",
          desc: "Nền tảng tích hợp toàn bộ quy trình quản lý bệnh viện trên một hệ thống thống nhất, từ tiếp nhận bệnh nhân, khám chữa bệnh, quản lý hồ sơ, thuốc và thanh toán đến báo cáo thống kê, góp phần nâng cao hiệu quả vận hành và chất lượng dịch vụ y tế"
        },
        {
          title: "SmartWallet — Ví Điện Tử Toàn Diện Với Ngân Hàng Số & Tài Chính Thông Minh",
          time: "2026 - 6 tháng",
          desc: "SmartWallet là một hệ thống ví điện tử toàn diện được mô phỏng theo mô hình hoạt động của các ứng dụng ví nổi tiếng như Momo, ZaloPay và Nimo. Dự án được phát triển dưới dạng Monorepo bao gồm mã nguồn Frontend React và Backend Node.js/Express tích hợp cơ sở dữ liệu MySQL thông qua Prisma ORM.",
          features: "Xác thực hai yếu tố, mã hóa end-to-end, và giao diện thanh toán có thể tùy chỉnh",
          processTitle: "Quy Trình Thực Hiện"
        }
      ],
      coreTitle: "Giá trị cốt lõi",
      bio: "Mình hiện là sinh viên tại FPT Academy, chuyên ngành Development & Design. Sau 2 năm theo học, mình đã có cơ hội tiếp cận nhiều kiến thức về lập trình, thiết kế giao diện và phát triển sản phẩm số. Quá trình học tập giúp mình rèn luyện tư duy logic, khả năng sáng tạo, kỹ năng làm việc nhóm và giải quyết vấn đề thông qua các dự án thực tế. Mình luôn mong muốn tiếp tục học hỏi, hoàn thiện bản thân và phát triển theo hướng trở thành một lập trình viên chuyên nghiệp trong tương lai.",
      skills: "Kỹ năng",
      industries: "Ngành",
      actionBtn: "Bắt đầu ngay",
      linkedinBtn: "Xem LinkedIn",
      readyTitle: "Sẵn sàng phát triển sản phẩm của bạn?",
      readySub: "Hãy bắt đầu hành trình biến ý tưởng thành hiện thực ngay hôm nay.",
      badgeReady: "Sẵn sàng cho cơ hội mới",
      copyright: "© 20226 Bản quyền thuộc về RajPham.",
      navHome: "giới thiệu",
      navProjects: "dự án",
      navContact: "liên hệ",
      tooltipHome: "Trang chủ",
      tooltipProjects: "Dự án",
      tooltipAbout: "Giới thiệu",
      tooltipContact: "Liên hệ"
    },
    en: {
      role: "Product Developer & Growth Strategist",
      description: "Product Developer. Designing product roadmaps, optimizing development lifecycles, and accelerating growth through modern technologies and data-driven insights.",
      explore: "Explore",
      journey: "Journey",
      journeyTitle: "Education & Work Experience",
      journeySub: "A journey of continuous learning, professional growth, and delivering value in product development.",
      journeyCards: [
        {
          title: "FPT Academy Student (HCM City)",
          time: "Currently Enrolled",
          type: "Education",
          concept: "Development & Design",
          desc: "Merging coding skills with design thinking to build beautiful, highly intuitive, and user-centric digital products."
        },
        {
          title: "Vietnam",
          time: "2026 - Present",
          type: "Career",
          concept: "Product Developer Specialist",
          desc: "Transforming concepts into viable products. Handling both frontend layout and backend integration to streamline execution."
        },
        {
          title: "Certifications & Achievements",
          time: "Continuously Updated",
          type: "Growth",
          concept: "Lifelong Learning",
          desc: "Acquired credentials in PMP, Agile Practitioner, and Google Analytics. Actively publishing tech blogs and attending industry conferences."
        }
      ],
      services: "Services",
      expertiseTitle: "Key Expertises",
      expertiseSub: "Strategic design, data analytics, and full-stack execution — delivered as high-performing, complete solutions.",
      expertises: [
        {
          title: "Product Strategy",
          type: "Strategy",
          desc: "Defining clear product roadmaps based on user research, market trends, and quantitative behavior metrics."
        },
        {
          title: "Analysis & Optimization",
          type: "Analytics",
          desc: "Leveraging structured data to optimize user journeys, reduce checkout friction, and boost overall conversion rates."
        },
        {
          title: "Product Lifecycle",
          type: "Lifecycle",
          desc: "Managing products from early wireframing and MVP launches to customer validation, beta testing, and scalable deployments."
        }
      ],
      projectEyebrow: "Project Portfolio",
      projectTitle: "Featured Projects",
      projectSub: "Every project represents a comprehensive lifecycle from user research and design to code launch and performance tuning.",
      projects: [
        {
          title: "TECHWIZ SEASON 6 – 2025 Responsive NextGen Website Development",
          time: "2025 - 6 Months",
          desc: "A responsive pet care platform connecting pet owners with veterinary consultations, grooming sessions, and health tracking utilities. Features modern scheduling workflows.",
          features: "High-throughput data stream architecture with sub-2s responses, real-time warning logs, and custom analytics dashboard for administrators.",
          processTitle: "Project Process-72 Hours"
        },
        {
          title: "MediCare - Hospital Management Platform",
          time: "2025 - 6 Months",
          desc: "An integrated healthcare enterprise web application to optimize patient registration, electronic health records (EHR), secure billing, and insurance workflows."
        },
        {
          title: "SmartWallet - Ví Điện Tử Toàn Diện Với Ngân Hàng Số & Tài Chính Thông Minh",
          time: "2026 - 6 Months",
          desc: "SmartWallet là một hệ thống ví điện tử toàn diện được mô phỏng theo mô hình hoạt động của các ứng dụng ví nổi tiếng như Momo, ZaloPay và Nimo. Dự án được phát triển dưới dạng Monorepo bao gồm mã nguồn Frontend React và Backend Node.js/Express tích hợp cơ sở dữ liệu MySQL thông qua Prisma ORM.",
          features: "End-to-end tokenization conforming to PCI DSS Level 1 security standards, multi-factor auth, and fully customizable UI hooks.",
          processTitle: "Development Process"
        }
      ],
      coreTitle: "Core Values",
      bio: "I am currently studying Development & Design at FPT Academy. Throughout my academic journey, I have had the opportunity to build full-stack web applications, design complex user interfaces, and understand product management flows. These experiences have refined my analytical mindset, creativity, and collaborative abilities. My ultimate goal is to continuously learn and grow into a professional developer, bringing high-impact tech products to life.",
      skills: "Skills",
      industries: "Industries",
      actionBtn: "Get in Touch",
      linkedinBtn: "View LinkedIn",
      readyTitle: "Ready to scale your next product?",
      readySub: "Let's turn your ideas into a fully optimized digital experience today.",
      badgeReady: "Available for new opportunities",
      copyright: "© 20226 Copyright by RajPham.",
      navHome: "about",
      navProjects: "projects",
      navContact: "contact",
      tooltipHome: "Home",
      tooltipProjects: "Projects",
      tooltipAbout: "About",
      tooltipContact: "Contact"
    }
  };

  const currentInfo = info[lang] || info.vi;

  return (
    <div id="app" className="bg-white text-neutral-900 font-sans min-h-screen relative overflow-x-hidden selection:bg-neutral-900 selection:text-white">
      
      {/* Self-contained styling block for advanced micro-animations & layout tweaks */}
      <style>{`
        .portfolio-grid-bg {
          background-image: radial-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px);
          background-size: 24px 24px;
        }
        .portfolio-card {
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .portfolio-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 22px 35px -10px rgba(0, 0, 0, 0.08);
          border-color: rgba(0, 0, 0, 0.16) !important;
        }
        .portfolio-btn {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .portfolio-btn:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 12px 24px -10px rgba(0, 0, 0, 0.15);
        }
        .portfolio-img-zoom {
          transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .portfolio-img-container:hover .portfolio-img-zoom {
          transform: scale(1.045);
        }
        
        @keyframes pulse-soft {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.95); }
        }
        .pulse-indicator {
          animation: pulse-soft 2s infinite ease-in-out;
        }

        @media (max-width: 1024px) {
          .portfolio-hero {
            background-size: cover !important;
            background-position: 25% center !important;
            height: auto !important;
            min-height: 60vh !important;
          }
          .hero-title {
            font-size: 3rem !important;
          }
        }
        @media (max-width: 768px) {
          .portfolio-hero {
            background-size: cover !important;
            background-position: 28% center !important;
            height: auto !important;
            min-height: 65vh !important;
            padding-top: 8rem !important;
            padding-bottom: 4rem !important;
          }
          .hero-title {
            font-size: 2.25rem !important;
            line-height: 1.1 !important;
            text-align: left !important;
            margin-top: 2rem !important;
          }
          .hero-bottom-left {
            margin-top: 2.5rem !important;
          }
        }
      `}</style>

      {/* SmartWallet Standard Navbar */}
      <Navbar />

      {/* Floating Sidebar Navigation (Indicator Widget) - Hides on small/medium screens to prevent overlap */}
      <aside className="hidden xl:block fixed left-6 top-1/2 -translate-y-1/2 z-30">
        <div className="flex flex-col gap-2.5 bg-white border-neutral-200 border rounded-full p-2 shadow-xl items-center backdrop-blur-md bg-white/90">
          <button 
            className={`group grid place-items-center hover:text-black hover:bg-neutral-100 transition-all duration-300 relative w-10 h-10 rounded-full cursor-pointer ${
              activeSection === "hero" ? "text-black bg-neutral-100 shadow-sm" : "text-neutral-400"
            }`}
            onClick={() => scrollToSection("hero")}
          >
            <Home className="w-4 h-4" />
            <span className="absolute left-13 bg-neutral-900 text-white text-xs px-2.5 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none font-mono shadow-md">
              {currentInfo.tooltipHome}
            </span>
          </button>
          
          <button 
            className={`group grid place-items-center hover:text-black hover:bg-neutral-100 transition-all duration-300 relative w-10 h-10 rounded-full cursor-pointer ${
              activeSection === "du-an" ? "text-black bg-neutral-100 shadow-sm" : "text-neutral-400"
            }`}
            onClick={() => scrollToSection("du-an")}
          >
            <Briefcase className="w-4 h-4" />
            <span className="absolute left-13 bg-neutral-900 text-white text-xs px-2.5 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none font-mono shadow-md">
              {currentInfo.tooltipProjects}
            </span>
          </button>

          <button 
            className={`group grid place-items-center hover:text-black hover:bg-neutral-100 transition-all duration-300 relative w-10 h-10 rounded-full cursor-pointer ${
              activeSection === "gia-tri" ? "text-black bg-neutral-100 shadow-sm" : "text-neutral-400"
            }`}
            onClick={() => scrollToSection("gia-tri")}
          >
            <User className="w-4 h-4" />
            <span className="absolute left-13 bg-neutral-900 text-white text-xs px-2.5 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none font-mono shadow-md">
              {currentInfo.tooltipAbout}
            </span>
          </button>

          <button 
            className={`group grid place-items-center hover:text-black hover:bg-neutral-100 transition-all duration-300 relative w-10 h-10 rounded-full cursor-pointer ${
              activeSection === "lien-he" ? "text-black bg-neutral-100 shadow-sm" : "text-neutral-400"
            }`}
            onClick={() => scrollToSection("lien-he")}
          >
            <Mail className="w-4 h-4" />
            <span className="absolute left-13 bg-neutral-900 text-white text-xs px-2.5 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none font-mono shadow-md">
              {currentInfo.tooltipContact}
            </span>
          </button>
        </div>
      </aside>

      {/* Reduced Height Hero Header Section (min-h-70vh to prevent huge empty vertical spaces) */}
      <header 
        id="hero"
        className="portfolio-hero relative w-full min-h-[65vh] md:min-h-[70vh] flex flex-col justify-end p-6 sm:p-12 pb-16 overflow-hidden bg-white pt-[120px] md:pt-[140px]"
        style={{
          backgroundImage: 'url("/portfolio_header_bg.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Animated 3D knot canvas overlay */}
        <div className="absolute inset-0 z-0">
          <CanvasTorusKnot />
        </div>

        {/* Hero Bottom Layout - Stacked nicely below absolute Canvas */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-12 w-full max-w-6xl mx-auto z-10 text-white pointer-events-auto">
          
          {/* Bottom Left: Bio snippet */}
          <div className="hero-bottom-left max-w-xs space-y-6 text-left">
            <p className="text-sm leading-relaxed text-neutral-300 font-medium">
              {currentInfo.description}
            </p>
            <button 
              onClick={() => scrollToSection("qua-trinh")} 
              className="group flex items-center gap-2 text-xs font-bold tracking-widest uppercase border-b border-white pb-1.5 text-white hover:text-neutral-300 hover:border-neutral-300 transition-all cursor-pointer"
            >
              {currentInfo.explore} <span className="group-hover:translate-y-0.5 transition-transform duration-300">↓</span>
            </button>
          </div>

          {/* Bottom Right: Responsive Title */}
          <div className="text-left md:text-right w-full md:w-auto">
            <h1 className="hero-title text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-tighter leading-[0.85] text-white">
              <span className="block">Product Developer</span>
              <span className="block">&amp; Growth Strategist</span>
            </h1>
          </div>

        </div>
      </header>

      {/* Main sections container - Flex column centered to ensure perfect horizontal centering */}
      <main className="relative z-20 bg-white w-full flex flex-col items-center">
        
        {/* Journey Section (with enlarged block margins py-36 to py-44 for breathing room) */}
        <section id="qua-trinh" className="portfolio-grid-bg w-full sm:px-8 px-6 bg-white border-t border-neutral-200 relative flex justify-center py-32 md:py-40">
          <div className="w-full max-w-6xl mx-auto">
            
            <div className="mb-20">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest font-mono">{currentInfo.journey}</span>
                <div className="h-px flex-1 bg-neutral-200"></div>
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-neutral-900 mb-4">{currentInfo.journeyTitle}</h2>
              <p className="text-lg text-neutral-500 font-mono max-w-2xl">{currentInfo.journeySub}</p>
            </div>

            {/* Grid gap enlarged for more space between cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12">
              {currentInfo.journeyCards.map((card, i) => {
                const cardThemes = [
                  {
                    bg: "from-blue-50 to-indigo-50",
                    border: "border-blue-100",
                    badgeBg: "bg-blue-50 text-blue-600 border-blue-100",
                    iconColor: "text-blue-600",
                    iconBorder: "border-blue-100",
                    icon: <GraduationCap className="w-8 h-8 text-blue-600" />
                  },
                  {
                    bg: "from-emerald-50 to-teal-50",
                    border: "border-emerald-100",
                    badgeBg: "bg-emerald-50 text-emerald-600 border-emerald-100",
                    iconColor: "text-emerald-600",
                    iconBorder: "border-emerald-100",
                    icon: <Briefcase className="w-8 h-8 text-emerald-600" />
                  },
                  {
                    bg: "from-amber-50 to-orange-50",
                    border: "border-amber-100",
                    badgeBg: "bg-amber-50 text-amber-600 border-amber-100",
                    iconColor: "text-amber-600",
                    iconBorder: "border-amber-100",
                    icon: <Award className="w-8 h-8 text-amber-600" />
                  }
                ][i];

                return (
                  <div key={i} className="portfolio-card bg-white border border-neutral-200 rounded-2xl p-6 hover:shadow-xl transition-all duration-300">
                    <div className={`h-48 mb-6 bg-gradient-to-br ${cardThemes.bg} rounded-xl overflow-hidden relative border ${cardThemes.border} flex items-center justify-center`}>
                      <div className="text-center p-4">
                        <div className={`w-16 h-16 rounded-full bg-white border-4 ${cardThemes.iconBorder} flex items-center justify-center mx-auto mb-4`}>
                          {cardThemes.icon}
                        </div>
                        <h4 className="text-lg font-semibold text-neutral-900">{card.title}</h4>
                        <p className="text-sm text-neutral-500 mt-1 font-mono">{card.time}</p>
                      </div>
                    </div>
                    <div className={`inline-flex gap-2 ${cardThemes.badgeBg} px-3 py-1 rounded-full text-xs font-semibold font-mono mb-4 border`}>
                      <BookOpen className="w-3 h-3 self-center" /> {card.type}
                    </div>
                    <h3 className="text-xl font-semibold text-neutral-900 mb-3">{card.concept}</h3>
                    <p className="text-neutral-500 text-sm leading-relaxed font-mono">{card.desc}</p>
                  </div>
                );
              })}
            </div>

          </div>
        </section>

        {/* Expertise Section (py-32 to py-40) */}
        <section id="dac-diem" className="portfolio-grid-bg w-full sm:px-8 px-6 bg-neutral-50 border-t border-neutral-200 flex justify-center py-32 md:py-40">
          <div className="w-full max-w-6xl mx-auto">
            
            <div className="mb-20">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest font-mono">{currentInfo.services}</span>
                <div className="h-px flex-1 bg-neutral-200"></div>
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-neutral-900 mb-4">{currentInfo.expertiseTitle}</h2>
              <p className="text-lg text-neutral-500 font-mono max-w-2xl">{currentInfo.expertiseSub}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12">
              {currentInfo.expertises.map((exp, i) => {
                const isFirst = i === 0;
                const isSecond = i === 1;
                const badgeThemes = [
                  "bg-blue-50 text-blue-600 border-blue-100",
                  "bg-purple-50 text-purple-600 border-purple-100",
                  "bg-emerald-50 text-emerald-600 border-emerald-100"
                ][i];

                return (
                  <div key={i} className="portfolio-card bg-white border border-neutral-200 rounded-2xl p-6 hover:shadow-xl transition-all duration-300">
                    <div className={`h-48 mb-6 rounded-xl overflow-hidden relative border flex items-center justify-center ${
                      isSecond ? "bg-neutral-900 border-neutral-800" : "bg-neutral-100 border-neutral-100"
                    }`}>
                      {isFirst ? (
                        <div className="w-full max-w-[200px] space-y-3">
                          <div className="flex gap-2 justify-center">
                            <div className="w-12 h-12 rounded-full border-2 border-neutral-300 flex items-center justify-center bg-white shadow-sm">
                              <div className="w-6 h-6 bg-neutral-800 rounded-sm"></div>
                            </div>
                            <div className="w-12 h-12 rounded-full border-2 border-neutral-300 flex items-center justify-center bg-white shadow-sm">
                              <div className="w-6 h-6 bg-neutral-400 rounded-sm"></div>
                            </div>
                          </div>
                          <div className="h-px w-full bg-neutral-300"></div>
                          <div className="flex justify-between px-4 text-[10px] font-mono text-neutral-400">
                            <span>Nghiên cứu</span>
                            <span>Chiến lược</span>
                            <span>Thực thi</span>
                          </div>
                        </div>
                      ) : isSecond ? (
                        <div className="space-y-2 w-full px-4">
                          <div className="flex items-end gap-1.5 h-16 justify-center">
                            <div className="w-4 bg-blue-500 rounded-t" style={{ height: "40%" }}></div>
                            <div className="w-4 bg-blue-500 rounded-t" style={{ height: "70%" }}></div>
                            <div className="w-4 bg-blue-500 rounded-t" style={{ height: "55%" }}></div>
                            <div className="w-4 bg-blue-500 rounded-t" style={{ height: "90%" }}></div>
                            <div className="w-4 bg-blue-500 rounded-t" style={{ height: "65%" }}></div>
                          </div>
                          <div className="flex justify-between text-[10px] text-neutral-500 font-mono pt-2 border-t border-neutral-800">
                            <span>Q1</span><span>Q2</span><span>Q3</span><span>Q4</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-white text-[10px] font-bold shadow-md">Ý tưởng</div>
                          <div className="w-8 h-px bg-neutral-300"></div>
                          <div className="w-12 h-12 rounded-full bg-neutral-600 flex items-center justify-center text-white text-[10px] font-bold shadow-md">MVP</div>
                          <div className="w-8 h-px bg-neutral-300"></div>
                          <div className="w-12 h-12 rounded-full bg-neutral-400 flex items-center justify-center text-white text-[10px] font-bold shadow-md">Scale</div>
                        </div>
                      )}
                    </div>
                    <div className={`inline-flex gap-2 ${badgeThemes} px-3 py-1 rounded-full text-xs font-semibold font-mono mb-4 border`}>
                      {isFirst ? <Target className="w-3 h-3 self-center" /> : isSecond ? <BarChart2 className="w-3 h-3 self-center" /> : <RefreshCw className="w-3 h-3 self-center" />}
                      {exp.type}
                    </div>
                    <h3 className="text-xl font-semibold text-neutral-900 mb-3">{exp.title}</h3>
                    <p className="text-neutral-500 text-sm leading-relaxed font-mono">{exp.desc}</p>
                  </div>
                );
              })}
            </div>

          </div>
        </section>

        {/* Projects Section (Enlarged row spaces from space-y-24 to space-y-36) */}
        <section id="du-an" className="portfolio-grid-bg w-full sm:px-8 px-6 bg-white border-t border-neutral-200 flex justify-center py-32 md:py-40">
          <div className="w-full max-w-6xl mx-auto">
            
            <div className="mb-20">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest font-mono">{currentInfo.projectEyebrow}</span>
                <div className="h-px flex-1 bg-neutral-200"></div>
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-neutral-900 mb-3">{currentInfo.projectTitle}</h2>
              <p className="text-lg text-neutral-500 font-mono max-w-2xl">{currentInfo.projectSub}</p>
            </div>

            {/* space-y-36 ensures plenty of vertical breathing room between project cards */}
            <div className="space-y-36">
              
              {/* Project 1 */}
              <article className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center group">
                <div className="order-2 lg:order-1 lg:col-span-7 space-y-4 text-left">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral-400 font-mono">{currentInfo.projects[0].time}</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-neutral-900 group-hover:text-neutral-700 transition-colors whitespace-pre-line leading-tight">
                    {currentInfo.projects[0].title}
                  </h3>
                  <p className="text-neutral-600 leading-relaxed text-sm md:text-base">{currentInfo.projects[0].desc}</p>
                  
                  <div className="pt-4 border-t border-neutral-100">
                    <h4 className="text-sm font-semibold text-neutral-900 mb-1.5 font-mono">{lang === 'vi' ? 'Nét Đặc Trưng' : 'Key Features'}</h4>
                    <p className="text-sm text-neutral-500 leading-relaxed">{currentInfo.projects[0].features}</p>
                  </div>

                  <div className="pt-3">
                    <h4 className="text-sm font-semibold text-neutral-900 mb-2 font-mono">{currentInfo.projects[0].processTitle}</h4>
                  </div>
                </div>
                
                <div className="order-1 lg:order-2 lg:col-span-5">
                  {/* Container set to max-w-md and aspect-16/10 for a much cleaner, reduced image size */}
                  <div className="portfolio-img-container bg-neutral-100 rounded-2xl overflow-hidden border border-neutral-200 aspect-[16/10] max-w-md mx-auto flex items-center justify-center p-3 shadow-sm hover:shadow-md transition-all duration-300">
                    <img src="/project_pet.png" alt="Pet Service Project" className="portfolio-img-zoom w-full h-full object-cover rounded-xl" />
                  </div>
                </div>
              </article>

              {/* Project 2 */}
              <article className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center group">
                <div className="order-1 lg:col-span-5">
                  {/* Container set to max-w-md and aspect-16/10 for a much cleaner, reduced image size */}
                  <div className="portfolio-img-container bg-neutral-100 rounded-2xl overflow-hidden border border-neutral-200 aspect-[16/10] max-w-md mx-auto flex items-center justify-center p-3 shadow-sm hover:shadow-md transition-all duration-300">
                    <img src="/project_medicare.png" alt="MediCare Project" className="portfolio-img-zoom w-full h-full object-cover rounded-xl" />
                  </div>
                </div>
                <div className="order-2 lg:col-span-7 space-y-4 text-left">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral-400 font-mono">{currentInfo.projects[1].time}</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-neutral-900 group-hover:text-neutral-700 transition-colors leading-tight">
                    {currentInfo.projects[1].title}
                  </h3>
                  <p className="text-neutral-600 leading-relaxed text-sm md:text-base">{currentInfo.projects[1].desc}</p>
                </div>
              </article>

              {/* Project 3 */}
              <article className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center group">
                <div className="order-2 lg:order-1 lg:col-span-7 space-y-4 text-left">
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-amber-50 text-amber-600 px-3 py-1 rounded-full font-semibold font-mono border border-amber-100">Payments</span>
                    <span className="text-xs text-neutral-400 font-mono">{currentInfo.projects[2].time}</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-neutral-900 group-hover:text-neutral-700 transition-colors leading-tight">
                    {currentInfo.projects[2].title}
                  </h3>
                  <p className="text-neutral-600 leading-relaxed text-sm md:text-base">{currentInfo.projects[2].desc}</p>
                  
                  <div className="pt-4 border-t border-neutral-100">
                    <h4 className="text-sm font-semibold text-neutral-900 mb-1.5 font-mono">{lang === 'vi' ? 'Nét Đặc Trưng' : 'Key Features'}</h4>
                    <p className="text-sm text-neutral-500 leading-relaxed">{currentInfo.projects[2].features}</p>
                  </div>
                  
                  <div className="pt-4 border-t border-neutral-100">
                    <h4 className="text-sm font-semibold text-neutral-900 mb-3 font-mono">{currentInfo.projects[2].processTitle}</h4>
                    <ul className="text-sm text-neutral-500 space-y-2.5">
                      <li className="flex items-start gap-2.5">
                        <span className="text-amber-500 font-mono">→</span> 
                        <span>{lang === 'vi' ? 'Khảo sát nhu cầu của 30+ nhà phát triển về các vấn đề tích hợp.' : 'Surveyed 30+ developers about integration bottlenecks.'}</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="text-amber-500 font-mono">→</span> 
                        <span>{lang === 'vi' ? 'Thiết kế kiến trúc module và API chi tiết.' : 'Designed modular architecture and detailed API specs.'}</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="text-amber-500 font-mono">→</span> 
                        <span>{lang === 'vi' ? 'Lập trình core design' : 'Coded key layout and design hooks.'}</span>
                      </li>
                    </ul>
                  </div>
                </div>
                
                <div className="order-1 lg:order-2 lg:col-span-5">
                  {/* Container set to max-w-md and aspect-16/10 for a much cleaner, reduced image size */}
                  <div className="portfolio-img-container bg-neutral-100 rounded-2xl overflow-hidden border border-neutral-200 aspect-[16/10] max-w-md mx-auto flex items-center justify-center p-3 shadow-sm hover:shadow-md transition-all duration-300">
                    <img src="/project_paywave.png" alt="PayWave SDK Project" className="portfolio-img-zoom w-full h-full object-cover rounded-xl" />
                  </div>
                </div>
              </article>

            </div>

          </div>
        </section>

        {/* Core Values / Portrait Section (Pushed spacing to py-32 to py-40) */}
        <section id="gia-tri" className="portfolio-grid-bg w-full sm:px-8 px-6 bg-white border-t border-neutral-100 flex justify-center py-32 md:py-40">
          <div className="w-full max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
              
              {/* Left Column: Grayscale hover zoom portrait (Reduced max-w-xs to make portrait smaller) */}
              <div className="lg:col-span-5">
                <div className="portfolio-img-container relative overflow-hidden bg-neutral-100 rounded-2xl aspect-[4/5] max-w-[280px] mx-auto shadow-md border border-neutral-200">
                  <img src="/rajpham_portrait.png" alt="RajPham Portrait" className="portfolio-img-zoom w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700 ease-out" />
                </div>
              </div>

              {/* Right Column: Bio text */}
              <div className="lg:col-span-7">
                <div className="flex flex-col justify-center h-full text-left">
                  <div className="flex items-center gap-3 mb-6">
                    <ArrowDownRight className="w-4 h-4 text-neutral-400" />
                    <div className="h-px flex-1 bg-neutral-200"></div>
                  </div>
                  <h2 className="text-3xl font-semibold text-neutral-900 mb-6 tracking-tight">{currentInfo.coreTitle}</h2>
                  <p className="text-base leading-relaxed text-neutral-600 mb-8 font-mono">{currentInfo.bio}</p>
                  
                  <div className="grid grid-cols-2 gap-6 mb-10 border-t border-neutral-150 pt-6">
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-neutral-900 font-mono uppercase tracking-wider">{currentInfo.skills}</h3>
                      <ul className="text-sm text-neutral-500 space-y-2">
                        <li className="font-mono">• Web Development</li>
                        <li className="font-mono">• Database Management</li>
                        <li className="font-mono">• UI/UX Design</li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-neutral-900 font-mono uppercase tracking-wider">{currentInfo.industries}</h3>
                      <ul className="text-sm text-neutral-500 space-y-2">
                        <li className="font-mono">• Software Development</li>
                        <li className="font-mono">• Fintech</li>
                        <li className="font-mono">• SaaS &amp; E-commerce</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => scrollToSection("lien-he")} 
                      className="portfolio-btn px-6 py-3.5 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 transition-colors font-mono text-sm cursor-pointer shadow-sm"
                    >
                      {currentInfo.actionBtn}
                    </button>
                    <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="portfolio-btn px-6 py-3.5 rounded-lg border border-neutral-200 text-neutral-900 font-medium hover:bg-neutral-50 transition-colors font-mono text-sm inline-flex items-center gap-1.5 shadow-sm bg-white">
                      {currentInfo.linkedinBtn} <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Ready to start Section (Contact Banner - py-32 to py-40) */}
        <section id="lien-he" className="bg-neutral-900 text-white w-full px-6 sm:px-8 py-32 text-center relative overflow-hidden flex justify-center">
          {/* Subtle design glows */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-blue-500/5 blur-[90px] pointer-events-none" />
          
          <div className="max-w-4xl mx-auto relative z-10 space-y-6">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">{currentInfo.readyTitle}</h2>
            <p className="text-lg text-neutral-400 max-w-md mx-auto font-mono leading-relaxed">{currentInfo.readySub}</p>
            <div className="pt-4">
              <button 
                onClick={() => window.location.href = "mailto:rajpham@example.com"}
                className="portfolio-btn px-8 py-4 bg-white text-neutral-900 rounded-full font-bold hover:bg-neutral-100 transition-all font-mono text-xs shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 cursor-pointer"
              >
                {currentInfo.actionBtn}
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-white border-t border-neutral-200 w-full px-6 sm:px-8 flex justify-center">
          <div className="w-full max-w-6xl py-12 md:py-20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 justify-between items-center">
              <div>
                <div className="font-bold text-lg tracking-tight mb-2">RajPham</div>
                <p className="text-neutral-500 text-sm font-mono">{currentInfo.copyright}</p>
              </div>
              <div className="flex flex-col md:flex-row gap-6 md:justify-end items-start md:items-center text-sm font-medium text-neutral-600">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs font-mono">
                  <span className="relative flex h-2 w-2">
                    <span className="pulse-indicator animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  {currentInfo.badgeReady}
                </div>
                <nav className="flex gap-6">
                  <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-black transition">LinkedIn</a>
                  <a href="mailto:rajpham@example.com" className="hover:text-black transition">Email</a>
                </nav>
              </div>
            </div>
          </div>
        </footer>

      </main>

    </div>
  );
}
