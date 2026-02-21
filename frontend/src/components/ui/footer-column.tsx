import {
    Dribbble,
    Facebook,
    Github,
    Instagram,
    Mail,
    MapPin,
    Phone,
    Twitter,
    Cpu
} from 'lucide-react';
import Link from 'next/link';

const data = {
    facebookLink: '#',
    instaLink: '#',
    twitterLink: '#',
    githubLink: '#',
    dribbbleLink: '#',
    services: {
        corePlatform: '#',
        interviewer: '#',
        codingEval: '#',
        integrations: '#',
    },
    about: {
        manifesto: '#',
        team: '#',
        research: '#',
        careers: '#',
    },
    help: {
        docs: '#',
        support: '#',
        status: '#',
    },
    contact: {
        email: 'hello@valtrix.ai',
        phone: '+1 (555) 000-0000',
        address: 'San Francisco, CA',
    },
    company: {
        name: 'VALTRIX',
        description:
            'The AI-Native Hiring Ecosystem where jobs become autonomous AI agents. Rebuilding hiring as autonomous, merit-driven, transparent, and structured.',
    },
};

const socialLinks = [
    { icon: Twitter, label: 'Twitter', href: data.twitterLink },
    { icon: Github, label: 'GitHub', href: data.githubLink },
];

const aboutLinks = [
    { text: 'Manifesto', href: data.about.manifesto },
    { text: 'Research', href: data.about.research },
    { text: 'Team', href: data.about.team },
    { text: 'Careers', href: data.about.careers },
];

const serviceLinks = [
    { text: 'Core Agent Platform', href: data.services.corePlatform },
    { text: 'AI Interviewer', href: data.services.interviewer },
    { text: 'Coding Evaluation', href: data.services.codingEval },
    { text: 'Integrations', href: data.services.integrations },
];

const helpfulLinks = [
    { text: 'Documentation', href: data.help.docs },
    { text: 'Support API', href: data.help.support },
    { text: 'System Status', href: data.help.status, hasIndicator: true },
];

const contactInfo = [
    { icon: Mail, text: data.contact.email },
    { icon: Phone, text: data.contact.phone },
    { icon: MapPin, text: data.contact.address, isAddress: true },
];

export default function Footer4Col() {
    return (
        <footer className="bg-black border-t border-white/10 mt-16 w-full place-self-end">
            <div className="mx-auto max-w-screen-xl px-4 pt-16 pb-6 sm:px-6 lg:px-8 lg:pt-24">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    <div>
                        <div className="text-white flex justify-center gap-2 sm:justify-start items-center">
                            <Cpu className="h-6 w-6 text-blue-500" />
                            <span className="text-2xl font-bold tracking-widest uppercase">
                                {data.company.name}
                            </span>
                        </div>

                        <p className="text-zinc-400 mt-6 max-w-md text-center leading-relaxed sm:max-w-xs sm:text-left">
                            {data.company.description}
                        </p>

                        <ul className="mt-8 flex justify-center gap-6 sm:justify-start md:gap-8">
                            {socialLinks.map(({ icon: Icon, label, href }) => (
                                <li key={label}>
                                    <Link
                                        href={href}
                                        className="text-zinc-400 hover:text-white transition"
                                    >
                                        <span className="sr-only">{label}</span>
                                        <Icon className="size-6" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4 lg:col-span-2">
                        <div className="text-center sm:text-left">
                            <p className="text-lg font-medium text-white">Platform</p>
                            <ul className="mt-8 space-y-4 text-sm">
                                {serviceLinks.map(({ text, href }) => (
                                    <li key={text}>
                                        <a
                                            className="text-zinc-400 hover:text-white transition"
                                            href={href}
                                        >
                                            {text}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="text-center sm:text-left">
                            <p className="text-lg font-medium text-white">Company</p>
                            <ul className="mt-8 space-y-4 text-sm">
                                {aboutLinks.map(({ text, href }) => (
                                    <li key={text}>
                                        <a
                                            className="text-zinc-400 hover:text-white transition"
                                            href={href}
                                        >
                                            {text}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="text-center sm:text-left">
                            <p className="text-lg font-medium text-white">Developers</p>
                            <ul className="mt-8 space-y-4 text-sm">
                                {helpfulLinks.map(({ text, href, hasIndicator }) => (
                                    <li key={text}>
                                        <a
                                            href={href}
                                            className={`${hasIndicator
                                                    ? 'group flex justify-center gap-1.5 sm:justify-start'
                                                    : 'text-zinc-400 hover:text-white transition'
                                                }`}
                                        >
                                            <span className="text-zinc-400 group-hover:text-white transition">
                                                {text}
                                            </span>
                                            {hasIndicator && (
                                                <span className="relative flex size-2 items-center justify-center mt-1">
                                                    <span className="bg-emerald-500 absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
                                                    <span className="bg-emerald-500 relative inline-flex size-2 rounded-full" />
                                                </span>
                                            )}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="text-center sm:text-left">
                            <p className="text-lg font-medium text-white">Contact</p>
                            <ul className="mt-8 space-y-4 text-sm">
                                {contactInfo.map(({ icon: Icon, text, isAddress }) => (
                                    <li key={text}>
                                        <div
                                            className="flex items-center justify-center gap-1.5 sm:justify-start"
                                        >
                                            <Icon className="text-blue-500 size-5 shrink-0" />
                                            {isAddress ? (
                                                <address className="text-zinc-400 -mt-0.5 flex-1 not-italic">
                                                    {text}
                                                </address>
                                            ) : (
                                                <span className="text-zinc-400 flex-1">
                                                    {text}
                                                </span>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="mt-12 border-t border-white/10 pt-6">
                    <div className="text-center sm:flex sm:justify-between sm:text-left">
                        <p className="text-sm text-zinc-500">
                            <span className="block sm:inline">Autonomous Hiring Systems</span>
                        </p>

                        <p className="text-zinc-500 mt-4 text-sm sm:order-first sm:mt-0">
                            &copy; 2026 {data.company.name} Ecosystem
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
