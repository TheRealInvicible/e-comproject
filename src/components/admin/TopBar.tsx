'use client';

import { useState } from 'react';
import { Bell, ChevronDown, Menu, X } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';

export function TopBar() {
  const { data: session } = useSession();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile menu button */}
      <button
        type="button"
        className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
        onClick={() => setShowMobileMenu(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex flex-1"></div>
        
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Notifications */}
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">View notifications</span>
            <Bell className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Separator */}
          <div
            className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200"
            aria-hidden="true"
          />

          {/* Profile dropdown */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-x-3 rounded-full text-sm focus:outline-none"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <span className="sr-only">Open user menu</span>
              <div className="relative h-8 w-8 rounded-full bg-gray-100">
                {session?.user?.image ? (
                  <Image
                    src={session.user.image}
                    alt=""
                    className="rounded-full"
                    fill
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-primary text-white text-sm font-medium uppercase">
                    {session?.user?.firstName?.[0] || 'U'}
                  </span>
                )}
              </div>
              <span className="hidden lg:flex lg:items-center">
                <span className="text-sm font-semibold leading-6 text-gray-900" aria-hidden="true">
                  {session?.user?.firstName} {session?.user?.lastName}
                </span>
                <ChevronDown className="ml-2 h-5 w-5 text-gray-400" aria-hidden="true" />
              </span>
            </button>

            {/* Profile dropdown menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
                <button
                  className="block px-3 py-1 text-sm leading-6 text-gray-900 hover:bg-gray-50 w-full text-left"
                  onClick={() => signOut()}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on mobile menu state */}
      {showMobileMenu && (
        <div className="relative z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-900/80" />

          <div className="fixed inset-0 flex">
            <div className="relative mr-16 flex w-full max-w-xs flex-1">
              <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                <button
                  type="button"
                  className="-m-2.5 p-2.5"
                  onClick={() => setShowMobileMenu(false)}
                >
                  <span className="sr-only">Close sidebar</span>
                  <X className="h-6 w-6 text-white" aria-hidden="true" />
                </button>
              </div>

              {/* Sidebar component for mobile */}
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-2">
                <div className="flex h-16 shrink-0 items-center">
                  <span className="text-xl font-bold text-primary">Dominion Store</span>
                </div>
                {/* Add mobile navigation here */}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}