import React, { useEffect, useRef } from 'react'
import { googleConfigError, initializeGisButton } from '../../auth/googleAuth'
import { BRAND_MARK_SRC } from '../../brand'
import { useAuthStore } from '../../store/authStore'

const SignInScreen: React.FC = () => {
  const buttonRef = useRef<HTMLDivElement>(null)
  const { error, applyCredential, setError } = useAuthStore()
  const configError = googleConfigError()
  const message = configError ?? error

  useEffect(() => {
    if (configError || !buttonRef.current) return
    let cancelled = false
    void initializeGisButton(buttonRef.current, (credential) => {
      if (!cancelled) applyCredential(credential)
    }).catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load Google Sign-In.')
    })
    return () => {
      cancelled = true
    }
  }, [applyCredential, configError, setError])

  return (
    <div className="signin-screen">
      <div className="signin-card">
        <img src={BRAND_MARK_SRC} alt="" className="signin-mark" />
        <h1 className="display signin-title">Local Hoops</h1>
        <p className="signin-copy">Sign in with an allowed Google account to open the financial dashboard.</p>
        {configError ? null : <div ref={buttonRef} className="signin-gis" />}
        {message ? <p className="signin-error">{message}</p> : null}
      </div>
    </div>
  )
}

export default SignInScreen
