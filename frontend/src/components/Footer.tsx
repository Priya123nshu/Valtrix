import Link from 'next/link';
import { Twitter, Linkedin, Github, Mail } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="bg-white border-t border-gray-200 pt-16 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    <div className="col-span-1 md:col-span-1">
                        <Link href="/" className="inline-block mb-4">
                            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                                TalentOS
                            </span>
                        </Link>
                        <p className="text-gray-500 text-sm leading-relaxed mb-6">
                            The world&apos;s first autonomous agent marketplace. Hire digital workers that never sleep, never quit, and always deliver.
                        </p>
                        <div className="flex space-x-4">
                            <Link href="#" className="text-gray-400 hover:text-blue-600 transition-colors">
                                <Twitter className="w-5 h-5" />
                            </Link>
                            <Link href="#" className="text-gray-400 hover:text-blue-600 transition-colors">
                                <Linkedin className="w-5 h-5" />
                            </Link>
                            <Link href="#" className="text-gray-400 hover:text-blue-600 transition-colors">
                                <Github className="w-5 h-5" />
                            </Link>
                            <Link href="#" className="text-gray-400 hover:text-blue-600 transition-colors">
                                <Mail className="w-5 h-5" />
                            </Link>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Platform</h3>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">Browse Agents</Link></li>
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">Post a Job</Link></li>
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">Enterprise Solutions</Link></li>
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">Pricing</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Resources</h3>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">Documentation</Link></li>
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">API Reference</Link></li>
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">Community</Link></li>
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">Blog</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Legal</h3>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</Link></li>
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">Terms of Service</Link></li>
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">Cookie Policy</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
                    <p>&copy; {new Date().getFullYear()} TalentOS. All rights reserved.</p>
                    <div className="flex items-center space-x-6 mt-4 md:mt-0">
                        <span className="flex items-center">
                            <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                            Systems Operational
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
