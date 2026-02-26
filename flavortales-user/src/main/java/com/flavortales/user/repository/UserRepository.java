package com.flavortales.user.repository;

import com.flavortales.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {

    boolean existsByEmail(String email);

    boolean existsByFullName(String fullName);

    Optional<User> findByEmail(String email);
}
