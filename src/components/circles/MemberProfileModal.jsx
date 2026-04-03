import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProfileByUserId } from '@/services/lawyers';
import { X, MapPin, Briefcase, Phone, Mail, Star, Loader2 } from 'lucide-react';
import TMLBadge from '@/components/ui/TMLBadge';

export default function MemberProfileModal({ member, onClose }) {
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['lawyerProfileByUserId', member.user_id],
    queryFn: () => getProfileByUserId(member.user_id).then(p => p ? [p] : []),
    enabled: !!member.user_id,
  });

  const profile = profiles[0] || null;
  const displayName = member.full_name || member.user_name || member.user_email;
  const initials = displayName?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#3a164d] to-[#5a2a6d] rounded-t-2xl p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-4">
            {profile?.profile_photo_url ? (
              <img
                src={profile.profile_photo_url}
                alt={displayName}
                className="w-16 h-16 rounded-full object-cover border-2 border-white/30"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-white text-2xl font-bold">
                {initials}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold">{displayName}</h2>
              {profile?.firm_name && <p className="text-white/70 text-sm">{profile.firm_name}</p>}
              <div className="mt-1">
                <TMLBadge variant={member.role === 'admin' ? 'accent' : 'default'} size="sm">
                  {member.role}
                </TMLBadge>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#3a164d]" />
            </div>
          ) : !profile ? (
            <div className="text-center py-6 text-gray-500">
              <p className="text-sm">No profile information available.</p>
              <p className="text-xs mt-1 text-gray-400">{member.user_email}</p>
            </div>
          ) : (
            <>
              {/* Contact */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{member.user_email}</span>
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                {profile.years_experience && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Star className="w-4 h-4 text-gray-400" />
                    <span>{profile.years_experience} years of experience</span>
                  </div>
                )}
              </div>

              {/* States Licensed */}
              {profile.states_licensed?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Licensed In</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.states_licensed.map(s => (
                      <span key={s} className="text-xs px-2 py-0.5 bg-[#3a164d]/10 text-[#3a164d] rounded font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Practice Areas */}
              {profile.practice_areas?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Practice Areas</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.practice_areas.map(area => (
                      <span key={area} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{area}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Bio */}
              {profile.bio && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">About</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{profile.bio}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}